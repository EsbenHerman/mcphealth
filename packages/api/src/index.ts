import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import PgBoss from "pg-boss";
import { syncRegistry } from "./registry-sync.js";
import { syncSmitheryRegistry } from "./registry-sync-smithery.js";
import { checkAndRecord, checkAllRemoteServers, complianceCheckAll } from "./health-checker.js";
import { getScoreBreakdown, scoreAllServers } from "./trust-score.js";
import { rateLimiter } from "./rate-limit.js";
import pool from "./db.js";

// Convert snake_case DB rows to camelCase for the frontend
function camelRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: [
      "https://mcphealth.dev",
      "https://www.mcphealth.dev",
      "http://localhost:3000",
      "http://localhost:3001",
    ],
  })
);

app.use("/*", rateLimiter());

app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

app.get("/", (c) => c.json({ name: "mcphealth-api", version: "0.1.0" }));

app.post("/api/sync", async (c) => {
  try {
    const count = await syncRegistry();
    return c.json({ ok: true, serverssynced: count });
  } catch (err: any) {
    console.error("[POST /api/sync] error:", err);
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// Manual health check endpoint
app.post("/api/check/:name{.+}", async (c) => {
  const name = c.req.param("name");
  try {
    const { rows } = await pool.query(
      "SELECT id FROM servers WHERE registry_name = $1",
      [name]
    );
    if (!rows[0]) return c.json({ ok: false, error: "Server not found" }, 404);
    const result = await checkAndRecord(rows[0].id);
    return c.json({ ok: true, result });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ── GET /api/stats — overall platform stats ──────────
app.get("/api/stats", async (c) => {
  try {
    const { rows: [stats] } = await pool.query(`
      SELECT
        COUNT(*)::int AS total_servers,
        COUNT(*) FILTER (WHERE current_status = 'up')::int AS servers_up,
        COUNT(*) FILTER (WHERE current_status = 'down')::int AS servers_down,
        COUNT(*) FILTER (WHERE current_status = 'degraded')::int AS servers_degraded,
        COUNT(*) FILTER (WHERE current_status = 'unknown' OR current_status IS NULL)::int AS servers_unknown,
        COUNT(*) FILTER (WHERE remote_url IS NOT NULL)::int AS remote_servers,
        COUNT(*) FILTER (WHERE remote_url IS NULL)::int AS local_only_servers,
        ROUND(AVG(trust_score)::numeric, 1) AS avg_trust_score,
        ROUND(AVG(uptime_24h)::numeric, 2) AS avg_uptime_24h,
        ROUND(AVG(latency_p50) FILTER (WHERE latency_p50 IS NOT NULL)::numeric, 0) AS avg_latency_p50
      FROM servers
    `);
    return c.json({ ok: true, ...camelRow(stats) });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ── GET /api/capabilities — list all known capabilities with server counts ──
app.get("/api/capabilities", async (c) => {
  try {
    const search = c.req.query("search") || null;
    const type = c.req.query("type") || null;
    const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "100"), 1), 500);

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`sc.name ILIKE $${idx}`);
      params.push(`%${search}%`);
      idx++;
    }
    if (type) {
      conditions.push(`sc.capability_type = $${idx}`);
      params.push(type);
      idx++;
    }

    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const { rows } = await pool.query(
      `SELECT sc.capability_type, sc.name, sc.description,
              COUNT(DISTINCT sc.server_id)::int AS server_count
       FROM server_capabilities sc
       ${where}
       GROUP BY sc.capability_type, sc.name, sc.description
       ORDER BY server_count DESC, sc.name ASC
       LIMIT $${idx}`,
      [...params, limit]
    );

    return c.json({ ok: true, capabilities: rows.map(camelRow) });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ── GET /api/servers — list with pagination, search, filters ──
app.get("/api/servers", async (c) => {
  try {
    const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "50"), 1), 200);
    const offset = Math.max(parseInt(c.req.query("offset") || "0"), 0);
    const search = c.req.query("search") || null;
    const status = c.req.query("status") || null;
    const transport = c.req.query("transport_type") || null;
    const registrySource = c.req.query("registry_source") || null;
    const capability = c.req.query("capability") || null;
    const scoreMin = c.req.query("score_min") ? Number(c.req.query("score_min")) : null;
    const scoreMax = c.req.query("score_max") ? Number(c.req.query("score_max")) : null;
    const sort = c.req.query("sort") || "trust_score";
    const order = (c.req.query("order") || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

    const allowedSorts: Record<string, string> = {
      trust_score: "s.trust_score",
      name: "s.registry_name",
      uptime: "s.uptime_24h",
      latency: "s.latency_p50",
      status: "s.current_status",
    };
    const sortCol = allowedSorts[sort] || "s.trust_score";

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;
    let joinCapabilities = false;

    if (search) {
      conditions.push(`(s.registry_name ILIKE $${idx} OR s.title ILIKE $${idx} OR s.description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (status === "remote") {
      conditions.push(`s.current_status NOT IN ('local', 'unknown') AND s.current_status IS NOT NULL`);
    } else if (status) {
      conditions.push(`s.current_status = $${idx}`);
      params.push(status);
      idx++;
    }
    if (transport) {
      conditions.push(`s.transport_type = $${idx}`);
      params.push(transport);
      idx++;
    }
    if (registrySource) {
      conditions.push(`s.registry_source = $${idx}`);
      params.push(registrySource);
      idx++;
    }
    if (capability) {
      joinCapabilities = true;
      conditions.push(`sc.name ILIKE $${idx}`);
      params.push(`%${capability}%`);
      idx++;
    }
    if (scoreMin != null) {
      conditions.push(`s.trust_score >= $${idx}`);
      params.push(scoreMin);
      idx++;
    }
    if (scoreMax != null) {
      conditions.push(`s.trust_score <= $${idx}`);
      params.push(scoreMax);
      idx++;
    }

    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const capJoin = joinCapabilities ? "JOIN server_capabilities sc ON sc.server_id = s.id" : "";

    const countQuery = `SELECT COUNT(DISTINCT s.id)::int AS total FROM servers s ${capJoin} ${where}`;
    const { rows: [{ total }] } = await pool.query(countQuery, params);

    const dataQuery = `
      SELECT DISTINCT s.id, s.registry_name, s.title, s.description, s.transport_type,
             s.current_status, s.trust_score, s.latency_p50, s.latency_p95,
             s.uptime_24h, s.uptime_7d, s.uptime_30d
      FROM servers s ${capJoin} ${where}
      ORDER BY ${sortCol} ${order} NULLS LAST
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const { rows } = await pool.query(dataQuery, [...params, limit, offset]);

    return c.json({ ok: true, total, limit, offset, servers: rows.map(camelRow) });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ── Server detail routes ──────────────────────────────
// Hono's {.+} is greedy and swallows /score and /checks suffixes,
// so we use a single catch-all and parse the suffix manually.
app.get("/api/servers/*", async (c) => {
  const fullPath = c.req.path.replace("/api/servers/", "");

  // Detect suffix
  let name: string;
  let action: "detail" | "score" | "checks" | "score-history";
  if (fullPath.endsWith("/score")) {
    name = fullPath.slice(0, -"/score".length);
    action = "score";
  } else if (fullPath.endsWith("/checks")) {
    name = fullPath.slice(0, -"/checks".length);
    action = "checks";
  } else if (fullPath.endsWith("/score-history")) {
    name = fullPath.slice(0, -"/score-history".length);
    action = "score-history" as any;
  } else {
    name = fullPath;
    action = "detail";
  }

  // Decode percent-encoded slashes from URL
  name = decodeURIComponent(name);

  if (!name) return c.json({ ok: false, error: "Server name required" }, 400);

  try {
    if (action === "score-history") {
      const days = Math.min(Math.max(parseInt(c.req.query("days") || "30"), 1), 365);
      const { rows: srv } = await pool.query(
        "SELECT id FROM servers WHERE registry_name = $1", [name]
      );
      if (!srv[0]) return c.json({ ok: false, error: "Server not found" }, 404);
      const { rows } = await pool.query(
        `SELECT scored_at, total_score, availability_score, latency_score,
                stability_score, compliance_score, metadata_score, freshness_score,
                popularity_score
         FROM score_history
         WHERE server_id = $1 AND scored_at >= NOW() - make_interval(days => $2)
         ORDER BY scored_at ASC`,
        [srv[0].id, days]
      );
      return c.json({ ok: true, history: rows.map(camelRow) });
    }

    if (action === "score") {
      const breakdown = await getScoreBreakdown(name);
      if (!breakdown) return c.json({ ok: false, error: "Server not found" }, 404);
      return c.json({ ok: true, ...breakdown });
    }

    // Look up server for detail and checks
    const { rows: srv } = await pool.query(
      "SELECT * FROM servers WHERE registry_name = $1", [name]
    );
    if (!srv[0]) return c.json({ ok: false, error: "Server not found" }, 404);

    if (action === "checks") {
      const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "100"), 1), 500);
      const offset = Math.max(parseInt(c.req.query("offset") || "0"), 0);
      const since = c.req.query("since") || new Date(Date.now() - 86400000).toISOString();

      const { rows: [{ total }] } = await pool.query(
        "SELECT COUNT(*)::int AS total FROM health_checks WHERE server_id = $1 AND checked_at >= $2",
        [srv[0].id, since]
      );

      const { rows: checks } = await pool.query(
        `SELECT id, status, latency_ms, error_message, check_level, checked_at
         FROM health_checks
         WHERE server_id = $1 AND checked_at >= $2
         ORDER BY checked_at DESC
         LIMIT $3 OFFSET $4`,
        [srv[0].id, since, limit, offset]
      );

      return c.json({ ok: true, total, limit, offset, checks: checks.map(camelRow) });
    }

    // detail — include capabilities
    const { rows: capabilities } = await pool.query(
      "SELECT capability_type, name, description FROM server_capabilities WHERE server_id = $1 ORDER BY capability_type, name",
      [srv[0].id]
    );
    const serverData = camelRow(srv[0]);
    serverData.capabilities = capabilities.map(camelRow);
    return c.json({ ok: true, server: serverData });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ── POST /api/admin/run-job — manually trigger jobs ──────────
const jobRateLimit = new Map<string, number>();
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

app.post("/api/admin/run-job", async (c) => {
  const adminSecret = process.env.ADMIN_SECRET;
  const auth = c.req.header("Authorization");
  if (!adminSecret || auth !== `Bearer ${adminSecret}`) {
    return c.json({ ok: false, error: "Unauthorized" }, 401);
  }

  const body = await c.req.json().catch(() => ({}));
  const job = body.job as string;
  const validJobs = ["compliance-check-all", "health-check-all", "registry-sync", "registry-sync-smithery", "trust-score-all"];
  if (!validJobs.includes(job)) {
    return c.json({ ok: false, error: `Invalid job. Valid: ${validJobs.join(", ")}` }, 400);
  }

  const lastRun = jobRateLimit.get(job) || 0;
  if (Date.now() - lastRun < RATE_LIMIT_MS) {
    const retryAfter = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastRun)) / 1000);
    return c.json({ ok: false, error: "Rate limited", retryAfterSeconds: retryAfter }, 429);
  }

  jobRateLimit.set(job, Date.now());

  try {
    let result: any;
    switch (job) {
      case "compliance-check-all": {
        const complianceResult = await complianceCheckAll();
        const rescoreResult = await scoreAllServers();
        result = { ...complianceResult, rescore: rescoreResult };
        break;
      }
      case "health-check-all": {
        const healthResult = await checkAllRemoteServers();
        const rescoreResult = await scoreAllServers();
        result = { ...healthResult, rescore: rescoreResult };
        break;
      }
      case "registry-sync":
        result = { serverssynced: await syncRegistry() };
        break;
      case "registry-sync-smithery":
        result = { serverssynced: await syncSmitheryRegistry() };
        break;
      case "trust-score-all":
        result = await scoreAllServers();
        break;
    }
    return c.json({ ok: true, job, result });
  } catch (err: any) {
    return c.json({ ok: false, job, error: err.message }, 500);
  }
});

// Manual score-all endpoint
app.post("/api/scores/calculate", async (c) => {
  try {
    const stats = await scoreAllServers();
    return c.json({ ok: true, ...stats });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ── GET /api/badge/:name — SVG status badge ──────────
app.get("/api/badge/*", async (c) => {
  const name = decodeURIComponent(c.req.path.replace("/api/badge/", ""));
  if (!name) return c.text("Missing server name", 400);

  try {
    const { rows } = await pool.query(
      "SELECT trust_score, current_status FROM servers WHERE registry_name = $1",
      [name]
    );
    if (!rows[0]) return c.text("Server not found", 404);

    const score = rows[0].trust_score != null ? Math.round(rows[0].trust_score) : "N/A";
    const status = rows[0].current_status || "unknown";

    const colorMap: Record<string, string> = {
      up: "#22c55e",
      down: "#ef4444",
      degraded: "#f59e0b",
      local: "#6b7280",
      unknown: "#6b7280",
    };
    const color = colorMap[status] || "#6b7280";

    const label = "MCPHealth";
    const value = `${score} · ${status}`;
    const labelWidth = label.length * 7 + 10;
    const valueWidth = value.length * 7 + 10;
    const totalWidth = labelWidth + valueWidth;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;

    c.header("Content-Type", "image/svg+xml");
    c.header("Cache-Control", "public, max-age=300");
    return c.body(svg);
  } catch (err: any) {
    return c.text("Error generating badge", 500);
  }
});

// ── RSS Feed helpers ──────────────────────────────────

function eventToItem(e: any, baseUrl: string): string {
  const serverName = e.title || e.registry_name;
  const link = `${baseUrl}/server/${encodeURIComponent(e.registry_name)}`;
  const pubDate = new Date(e.created_at).toUTCString();
  let title: string;
  let desc: string;

  switch (e.event_type) {
    case "status_change":
      title = e.new_value === "down" || e.new_value === "timeout"
        ? `${serverName} went down`
        : e.new_value === "up"
        ? `${serverName} is back up`
        : `${serverName} status: ${e.new_value}`;
      desc = `Status changed from ${e.old_value} to ${e.new_value}`;
      break;
    case "server_added":
      title = `New server: ${e.new_value}`;
      desc = `${e.new_value} was added to the registry`;
      break;
    case "score_change":
      title = `${serverName} trust score: ${e.old_value} → ${e.new_value}`;
      desc = `Trust score changed from ${e.old_value} to ${e.new_value}`;
      break;
    case "compliance_change":
      title = `${serverName} failed compliance check`;
      desc = `Compliance changed from ${e.old_value} to ${e.new_value}`;
      break;
    default:
      title = `${serverName}: ${e.event_type}`;
      desc = `${e.old_value || ""} → ${e.new_value}`;
  }

  return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <description>${escapeXml(desc)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">mcphealth-event-${e.id}</guid>
    </item>`;
}

// ── GET /api/feed — Global RSS feed ──────────────────
app.get("/api/feed", async (c) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.id, e.event_type, e.old_value, e.new_value, e.created_at,
             s.registry_name, s.title
      FROM server_events e
      JOIN servers s ON s.id = e.server_id
      WHERE e.event_type IN ('status_change', 'server_added')
      ORDER BY e.created_at DESC
      LIMIT 100
    `);

    const baseUrl = process.env.PUBLIC_URL || "https://mcphealth.dev";
    const apiBase = process.env.API_BASE_URL || "https://api.mcphealth.dev";
    const now = new Date().toUTCString();
    const items = rows.map((r: any) => eventToItem(r, baseUrl)).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MCPHealth — Status Feed</title>
    <link>${baseUrl}</link>
    <description>Status changes and new servers on MCPHealth</description>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${apiBase}/api/feed" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

    c.header("Content-Type", "application/rss+xml; charset=utf-8");
    c.header("Cache-Control", "public, max-age=300");
    return c.body(xml);
  } catch (err: any) {
    return c.text("Error generating feed", 500);
  }
});

// ── GET /api/feed/:name — Per-server RSS feed ────────
app.get("/api/feed/*", async (c) => {
  const name = decodeURIComponent(c.req.path.replace("/api/feed/", ""));
  if (!name) return c.text("Missing server name", 400);

  try {
    const { rows: srv } = await pool.query(
      "SELECT id, registry_name, title FROM servers WHERE registry_name = $1",
      [name]
    );
    if (!srv[0]) return c.text("Server not found", 404);

    const { rows } = await pool.query(`
      SELECT e.id, e.event_type, e.old_value, e.new_value, e.created_at,
             s.registry_name, s.title
      FROM server_events e
      JOIN servers s ON s.id = e.server_id
      WHERE e.server_id = $1
        AND e.event_type IN ('status_change', 'score_change', 'compliance_change')
      ORDER BY e.created_at DESC
      LIMIT 100
    `, [srv[0].id]);

    const baseUrl = process.env.PUBLIC_URL || "https://mcphealth.dev";
    const apiBase = process.env.API_BASE_URL || "https://api.mcphealth.dev";
    const now = new Date().toUTCString();
    const serverTitle = srv[0].title || srv[0].registry_name;
    const items = rows.map((r: any) => eventToItem(r, baseUrl)).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MCPHealth — ${escapeXml(serverTitle)}</title>
    <link>${baseUrl}/server/${encodeURIComponent(name)}</link>
    <description>Events for ${escapeXml(serverTitle)} on MCPHealth</description>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${apiBase}/api/feed/${encodeURIComponent(name)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

    c.header("Content-Type", "application/rss+xml; charset=utf-8");
    c.header("Cache-Control", "public, max-age=300");
    return c.body(xml);
  } catch (err: any) {
    return c.text("Error generating feed", 500);
  }
});

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Mark stdio/local servers that can't be health-checked
async function markLocalServers() {
  const { rowCount } = await pool.query(
    "UPDATE servers SET current_status = 'local' WHERE remote_url IS NULL AND current_status != 'local'"
  );
  if (rowCount && rowCount > 0) console.log(`[startup] marked ${rowCount} local-only servers`);
}
markLocalServers().catch(console.error);

// pg-boss scheduler
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  const boss = new PgBoss(databaseUrl);

  boss.on("error", (err) => console.error("[pg-boss] error:", err));

  boss.start().then(async () => {
    // Create queues first (pg-boss v10 requires explicit queue creation)
    await boss.createQueue("registry-sync").catch(() => {});
    await boss.createQueue("registry-sync-smithery").catch(() => {});
    await boss.createQueue("health-check-all").catch(() => {});
    await boss.createQueue("trust-score-all").catch(() => {});
    console.log("[pg-boss] started");

    const SYNC_JOB = "registry-sync";

    // Schedule every 6 hours
    await boss.schedule(SYNC_JOB, "0 */6 * * *");
    console.log("[pg-boss] scheduled registry-sync every 6h");

    await boss.work(SYNC_JOB, async () => {
      console.log("[pg-boss] running registry-sync job...");
      const count = await syncRegistry();
      console.log(`[pg-boss] registry-sync done — ${count} servers`);
      await markLocalServers();
    });

    // Smithery sync job — every 6 hours
    const SMITHERY_SYNC_JOB = "registry-sync-smithery";
    await boss.schedule(SMITHERY_SYNC_JOB, "0 */6 * * *");
    console.log("[pg-boss] scheduled registry-sync-smithery every 6h");

    await boss.work(SMITHERY_SYNC_JOB, async () => {
      console.log("[pg-boss] running registry-sync-smithery job...");
      const count = await syncSmitheryRegistry();
      console.log(`[pg-boss] registry-sync-smithery done — ${count} servers`);
      await markLocalServers();
    });

    // Health check job — every 15 minutes
    const HEALTH_JOB = "health-check-all";
    await boss.schedule(HEALTH_JOB, "*/15 * * * *");
    console.log("[pg-boss] scheduled health-check-all every 15min");

    await boss.work(HEALTH_JOB, async () => {
      console.log("[pg-boss] running health-check-all...");
      const stats = await checkAllRemoteServers();
      console.log(`[pg-boss] health-check done — ${JSON.stringify(stats)}`);
      // Score all servers after health checks complete
      console.log("[pg-boss] calculating trust scores...");
      const scoreStats = await scoreAllServers();
      console.log(`[pg-boss] trust scores done — ${JSON.stringify(scoreStats)}`);
    });

    // Protocol compliance check — every 6 hours
    const COMPLIANCE_JOB = "compliance-check-all";
    await boss.createQueue(COMPLIANCE_JOB).catch(() => {});
    await boss.schedule(COMPLIANCE_JOB, "0 */6 * * *");
    console.log("[pg-boss] scheduled compliance-check-all every 6h");

    await boss.work(COMPLIANCE_JOB, async () => {
      console.log("[pg-boss] running compliance-check-all...");
      const stats = await complianceCheckAll();
      console.log(`[pg-boss] compliance done — ${JSON.stringify(stats)}`);
      // Rescore after compliance
      const scoreStats = await scoreAllServers();
      console.log(`[pg-boss] trust scores updated — ${JSON.stringify(scoreStats)}`);
    });

    // Trust score recalculation — every 30 minutes
    const SCORE_JOB = "trust-score-all";
    await boss.schedule(SCORE_JOB, "*/30 * * * *");
    console.log("[pg-boss] scheduled trust-score-all every 30min");

    await boss.work(SCORE_JOB, async () => {
      console.log("[pg-boss] running trust-score-all...");
      const stats = await scoreAllServers();
      console.log(`[pg-boss] trust-score done — ${JSON.stringify(stats)}`);
    });
  });
}

const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`MCPHealth API running on http://localhost:${info.port}`);
});
