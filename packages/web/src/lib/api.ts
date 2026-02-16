// Use server-side env var at runtime (not baked in at build time like NEXT_PUBLIC_*)
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://api.mcphealth.dev";

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export interface ServerListResponse {
  servers: ServerRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface ServerRow {
  registryName: string;
  title: string | null;
  description: string | null;
  transportType: string;
  currentStatus: string;
  trustScore: number | null;
  latencyP50: number | null;
  uptime24h: number | null;
}

export interface StatsResponse {
  totalServers: number;
  serversUp: number;
  serversDown: number;
  serversUnknown: number;
  remoteServers: number;
  localOnlyServers: number;
  avgTrustScore: number | null;
}

export interface ScoreFactor {
  score: number | null;
  weight: number;
  weighted: number;
  raw?: any;
}

export interface ScoreBreakdown {
  totalScore: number;
  tier: string;
  tierEmoji: string;
  isLocalOnly: boolean;
  factors: {
    availability: ScoreFactor;
    latency: ScoreFactor;
    schemaStability: ScoreFactor;
    protocolCompliance: ScoreFactor;
    metadataQuality: ScoreFactor;
    freshness: ScoreFactor;
    popularity: ScoreFactor;
  };
}

export function getServers(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<ServerListResponse>(`/api/servers${qs ? `?${qs}` : ""}`);
}

export async function getServer(name: string) {
  const res = await apiFetch<{ ok: boolean; server: any }>(`/api/servers/${encodeURIComponent(name)}`);
  return res.server;
}

export function getServerChecks(name: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<{ checks: any[]; total: number }>(`/api/servers/${encodeURIComponent(name)}/checks${qs ? `?${qs}` : ""}`);
}

export function getServerScore(name: string) {
  return apiFetch<ScoreBreakdown>(`/api/servers/${encodeURIComponent(name)}/score`);
}

export interface ScoreHistoryPoint {
  scoredAt: string;
  totalScore: number;
  availabilityScore: number | null;
  latencyScore: number | null;
  stabilityScore: number | null;
  complianceScore: number | null;
  metadataScore: number | null;
  freshnessScore: number | null;
  popularityScore: number | null;
}

export function getScoreHistory(name: string, days = 30) {
  return apiFetch<{ ok: boolean; history: ScoreHistoryPoint[] }>(
    `/api/servers/${encodeURIComponent(name)}/score-history?days=${days}`
  );
}

export function getStats() {
  return apiFetch<StatsResponse>("/api/stats");
}
