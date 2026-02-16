import pool from "./db.js";
// Import constants directly — workspace linking
const SCORE_WEIGHTS = {
  availability: 0.30,
  latency: 0.15,
  schemaStability: 0.18,
  protocolCompliance: 0.12,
  metadataQuality: 0.10,
  freshness: 0.05,
  popularity: 0.10, // external_use_count from Smithery
} as const;

const LOCAL_ONLY_MAX_SCORE = 60;

const SCORE_TIERS = [
  { tier: "excellent", label: "Excellent", emoji: "🟢", min: 90, max: 100 },
  { tier: "good", label: "Good", emoji: "🟡", min: 70, max: 89 },
  { tier: "fair", label: "Fair", emoji: "🟠", min: 50, max: 69 },
  { tier: "poor", label: "Poor", emoji: "🔴", min: 0, max: 49 },
] as const;

// ── Factor scoring functions ────────────────────────

/** Availability: uptime % over rolling 30 days → 0-100 */
function scoreAvailability(uptimePercent: number | null): number {
  if (uptimePercent == null) return 0;
  if (uptimePercent >= 99.9) return 100;
  if (uptimePercent >= 99) return 90;
  if (uptimePercent >= 95) return 70;
  if (uptimePercent >= 90) return 50;
  if (uptimePercent >= 80) return 25;
  return 0;
}

/** Latency: p95 in ms → 0-100 */
function scoreLatency(p95Ms: number | null): number {
  if (p95Ms == null) return 0;
  if (p95Ms < 500) return 100;
  if (p95Ms < 1000) return 80;
  if (p95Ms < 2000) return 66;
  if (p95Ms < 5000) return 33;
  return 0;
}

/** Schema stability: days since last tools_hash change → 0-100 */
function scoreStability(daysSinceChange: number | null): number {
  if (daysSinceChange == null) return 100; // never changed = stable
  if (daysSinceChange >= 30) return 100;
  if (daysSinceChange >= 14) return 80;
  if (daysSinceChange >= 7) return 65;
  if (daysSinceChange >= 3) return 50;
  if (daysSinceChange >= 1) return 33;
  return 25;
}

/** Protocol compliance: boolean → 0 or 100 */
function scoreCompliance(passes: boolean | null): number {
  if (passes == null) return 50; // unknown = partial credit
  return passes ? 100 : 0;
}

/** Metadata quality: check fields → 0-100 */
function scoreMetadata(server: {
  description: string | null;
  repo_url: string | null;
  icon_url: string | null;
  website_url: string | null;
  version: string | null;
}): number {
  let score = 0;
  if (server.description && server.description.length > 10) score += 20;
  if (server.repo_url) score += 20;
  if (server.icon_url) score += 20;
  if (server.website_url) score += 20;
  if (server.version && /^\d+\.\d+\.\d+/.test(server.version)) score += 20;
  return score;
}

/** Freshness: days since registry update → 0-100 */
function scoreFreshness(registryUpdatedAt: Date | null): number {
  if (!registryUpdatedAt) return 0;
  const days = (Date.now() - registryUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 30) return 100;
  if (days <= 90) return 80;
  if (days <= 180) return 50;
  return 0;
}

/** Popularity: external use count from Smithery → 0-100 */
function scorePopularity(externalUseCount: number | null): number {
  if (externalUseCount == null) return 50; // neutral score for unknown
  if (externalUseCount >= 1000) return 100;
  if (externalUseCount >= 500) return 90;
  if (externalUseCount >= 100) return 80;
  if (externalUseCount >= 50) return 70;
  if (externalUseCount >= 25) return 60;
  if (externalUseCount >= 10) return 50;
  if (externalUseCount >= 5) return 40;
  if (externalUseCount >= 1) return 30;
  return 20; // 0 uses
}

// ── Uptime calculation helpers ──────────────────────

interface UptimeStats {
  uptime24h: number | null;
  uptime7d: number | null;
  uptime30d: number | null;
  latencyP50: number | null;
  latencyP95: number | null;
  compliancePass: boolean | null;
  daysSinceSchemaChange: number | null;
}

async function getServerStats(serverId: string): Promise<UptimeStats> {
  // Uptime percentages
  const uptimeQuery = `
    SELECT
      COUNT(*) FILTER (WHERE checked_at > now() - interval '24 hours') AS total_24h,
      COUNT(*) FILTER (WHERE checked_at > now() - interval '24 hours' AND status = 'up') AS up_24h,
      COUNT(*) FILTER (WHERE checked_at > now() - interval '7 days') AS total_7d,
      COUNT(*) FILTER (WHERE checked_at > now() - interval '7 days' AND status = 'up') AS up_7d,
      COUNT(*) FILTER (WHERE checked_at > now() - interval '30 days') AS total_30d,
      COUNT(*) FILTER (WHERE checked_at > now() - interval '30 days' AND status = 'up') AS up_30d
    FROM health_checks WHERE server_id = $1
  `;
  const { rows: [u] } = await pool.query(uptimeQuery, [serverId]);

  const pct = (up: number, total: number) => total > 0 ? (up / total) * 100 : null;
  const uptime24h = pct(Number(u.up_24h), Number(u.total_24h));
  const uptime7d = pct(Number(u.up_7d), Number(u.total_7d));
  const uptime30d = pct(Number(u.up_30d), Number(u.total_30d));

  // Latency percentiles (from successful checks in last 30 days)
  const latencyQuery = `
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95
    FROM health_checks
    WHERE server_id = $1 AND status = 'up' AND latency_ms IS NOT NULL
      AND checked_at > now() - interval '30 days'
  `;
  const { rows: [lat] } = await pool.query(latencyQuery, [serverId]);
  const latencyP50 = lat?.p50 != null ? Math.round(Number(lat.p50)) : null;
  const latencyP95 = lat?.p95 != null ? Math.round(Number(lat.p95)) : null;

  // Latest compliance check
  const compQuery = `
    SELECT compliance_pass FROM health_checks
    WHERE server_id = $1 AND check_level = 'compliance' AND compliance_pass IS NOT NULL
    ORDER BY checked_at DESC LIMIT 1
  `;
  const { rows: compRows } = await pool.query(compQuery, [serverId]);
  const compliancePass = compRows[0]?.compliance_pass ?? null;

  // Days since last schema change (tools_hash change)
  const schemaQuery = `
    SELECT captured_at FROM schema_snapshots
    WHERE server_id = $1
    ORDER BY captured_at DESC LIMIT 2
  `;
  const { rows: snapshots } = await pool.query(schemaQuery, [serverId]);
  let daysSinceSchemaChange: number | null = null;
  if (snapshots.length >= 2) {
    // There was at least one change; most recent snapshot is the latest hash
    const lastChange = new Date(snapshots[0].captured_at);
    daysSinceSchemaChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
  }
  // If 0 or 1 snapshots, no change detected → null (treated as stable)

  return { uptime24h, uptime7d, uptime30d, latencyP50, latencyP95, compliancePass, daysSinceSchemaChange };
}

// ── Main scoring function ───────────────────────────

export interface ScoreBreakdown {
  totalScore: number;
  tier: string;
  tierEmoji: string;
  isLocalOnly: boolean;
  factors: {
    availability: { score: number; weight: number; weighted: number; raw: number | null };
    latency: { score: number; weight: number; weighted: number; raw: number | null };
    schemaStability: { score: number; weight: number; weighted: number; raw: number | null };
    protocolCompliance: { score: number; weight: number; weighted: number; raw: boolean | null };
    metadataQuality: { score: number; weight: number; weighted: number };
    freshness: { score: number; weight: number; weighted: number; raw: Date | null };
    popularity: { score: number; weight: number; weighted: number; raw: number | null };
  };
  stats: {
    uptime24h: number | null;
    uptime7d: number | null;
    uptime30d: number | null;
    latencyP50: number | null;
    latencyP95: number | null;
  };
}

export async function calculateScore(serverId: string): Promise<ScoreBreakdown> {
  const { rows: [server] } = await pool.query(
    "SELECT * FROM servers WHERE id = $1", [serverId]
  );
  if (!server) throw new Error(`Server ${serverId} not found`);

  const isLocalOnly = !server.remote_url;

  let stats: UptimeStats = {
    uptime24h: null, uptime7d: null, uptime30d: null,
    latencyP50: null, latencyP95: null,
    compliancePass: null, daysSinceSchemaChange: null,
  };

  if (!isLocalOnly) {
    stats = await getServerStats(serverId);
  }

  // Calculate individual factor scores (0-100 each)
  const avail = scoreAvailability(stats.uptime30d ?? stats.uptime7d ?? stats.uptime24h);
  const lat = scoreLatency(stats.latencyP95);
  const stab = scoreStability(stats.daysSinceSchemaChange);
  const comp = scoreCompliance(stats.compliancePass);
  const meta = scoreMetadata(server);
  const fresh = scoreFreshness(server.registry_updated_at ? new Date(server.registry_updated_at) : null);
  const pop = scorePopularity(server.external_use_count);

  let totalScore: number;

  if (isLocalOnly) {
    // Local-only: only metadata + freshness + popularity, capped at 60
    const localScore = (meta * 0.5 + fresh * 0.25 + pop * 0.25);
    totalScore = Math.min(Math.round(localScore * LOCAL_ONLY_MAX_SCORE / 100), LOCAL_ONLY_MAX_SCORE);
  } else {
    totalScore = Math.round(
      avail * SCORE_WEIGHTS.availability +
      lat * SCORE_WEIGHTS.latency +
      stab * SCORE_WEIGHTS.schemaStability +
      comp * SCORE_WEIGHTS.protocolCompliance +
      meta * SCORE_WEIGHTS.metadataQuality +
      fresh * SCORE_WEIGHTS.freshness +
      pop * SCORE_WEIGHTS.popularity
    );
  }

  totalScore = Math.max(0, Math.min(100, totalScore));

  const tierInfo = SCORE_TIERS.find(t => totalScore >= t.min && totalScore <= t.max) ?? SCORE_TIERS[SCORE_TIERS.length - 1];

  return {
    totalScore,
    tier: tierInfo.tier,
    tierEmoji: tierInfo.emoji,
    isLocalOnly,
    factors: {
      availability: { score: avail, weight: SCORE_WEIGHTS.availability, weighted: avail * SCORE_WEIGHTS.availability, raw: stats.uptime30d },
      latency: { score: lat, weight: SCORE_WEIGHTS.latency, weighted: lat * SCORE_WEIGHTS.latency, raw: stats.latencyP95 },
      schemaStability: { score: stab, weight: SCORE_WEIGHTS.schemaStability, weighted: stab * SCORE_WEIGHTS.schemaStability, raw: stats.daysSinceSchemaChange },
      protocolCompliance: { score: comp, weight: SCORE_WEIGHTS.protocolCompliance, weighted: comp * SCORE_WEIGHTS.protocolCompliance, raw: stats.compliancePass },
      metadataQuality: { score: meta, weight: SCORE_WEIGHTS.metadataQuality, weighted: meta * SCORE_WEIGHTS.metadataQuality },
      freshness: { score: fresh, weight: SCORE_WEIGHTS.freshness, weighted: fresh * SCORE_WEIGHTS.freshness, raw: server.registry_updated_at },
      popularity: { score: pop, weight: SCORE_WEIGHTS.popularity, weighted: pop * SCORE_WEIGHTS.popularity, raw: server.external_use_count },
    },
    stats: {
      uptime24h: stats.uptime24h,
      uptime7d: stats.uptime7d,
      uptime30d: stats.uptime30d,
      latencyP50: stats.latencyP50,
      latencyP95: stats.latencyP95,
    },
  };
}

// ── Batch scoring ───────────────────────────────────

export async function scoreAllServers(): Promise<{ scored: number; errors: number }> {
  const { rows: servers } = await pool.query("SELECT id FROM servers ORDER BY registry_name");

  let scored = 0, errors = 0;
  const BATCH = 20;

  for (let i = 0; i < servers.length; i += BATCH) {
    const batch = servers.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (s) => {
        // Get old score before calculating new one
        const { rows: [oldRow] } = await pool.query("SELECT trust_score FROM servers WHERE id = $1", [s.id]);
        const oldScore = oldRow?.trust_score;

        const breakdown = await calculateScore(s.id);

        // Emit score_change event if difference >= 5
        if (oldScore != null && Math.abs(breakdown.totalScore - oldScore) >= 5) {
          await pool.query(
            "INSERT INTO server_events (server_id, event_type, old_value, new_value) VALUES ($1, 'score_change', $2, $3)",
            [s.id, String(Math.round(oldScore)), String(breakdown.totalScore)]
          );
        }

        // Store in score_history
        await pool.query(
          `INSERT INTO score_history (id, server_id, scored_at, total_score, availability_score, latency_score, stability_score, compliance_score, metadata_score, freshness_score, popularity_score)
           VALUES (gen_random_uuid(), $1, now(), $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            s.id,
            breakdown.totalScore,
            breakdown.factors.availability.weighted,
            breakdown.factors.latency.weighted,
            breakdown.factors.schemaStability.weighted,
            breakdown.factors.protocolCompliance.weighted,
            breakdown.factors.metadataQuality.weighted,
            breakdown.factors.freshness.weighted,
            breakdown.factors.popularity.weighted,
          ]
        );

        // Update cached scores on servers table
        await pool.query(
          `UPDATE servers SET
            trust_score = $2,
            current_status = COALESCE(current_status, 'unknown'),
            uptime_24h = $3,
            uptime_7d = $4,
            uptime_30d = $5,
            latency_p50 = $6,
            latency_p95 = $7
          WHERE id = $1`,
          [
            s.id,
            breakdown.totalScore,
            breakdown.stats.uptime24h,
            breakdown.stats.uptime7d,
            breakdown.stats.uptime30d,
            breakdown.stats.latencyP50,
            breakdown.stats.latencyP95,
          ]
        );

        return breakdown;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") scored++;
      else {
        errors++;
        console.error("[trust-score] error:", r.reason?.message || r.reason);
      }
    }

    if (servers.length > BATCH) {
      console.log(`[trust-score] batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(servers.length / BATCH)} done`);
    }
  }

  return { scored, errors };
}

// ── Get score for API ───────────────────────────────

export async function getScoreBreakdown(registryName: string): Promise<ScoreBreakdown | null> {
  const { rows } = await pool.query(
    "SELECT id FROM servers WHERE registry_name = $1",
    [registryName]
  );
  if (!rows[0]) return null;
  return calculateScore(rows[0].id);
}
