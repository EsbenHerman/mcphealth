// Use server-side env var at runtime (not baked in at build time like NEXT_PUBLIC_*)
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  avgTrustScore: number | null;
}

export interface ScoreBreakdown {
  totalScore: number;
  availability: number | null;
  latency: number | null;
  schemaStability: number | null;
  protocolCompliance: number | null;
  metadataQuality: number | null;
  freshness: number | null;
}

export function getServers(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<ServerListResponse>(`/api/servers${qs ? `?${qs}` : ""}`);
}

export function getServer(name: string) {
  return apiFetch<any>(`/api/servers/${encodeURIComponent(name)}`);
}

export function getServerChecks(name: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<{ checks: any[]; total: number }>(`/api/servers/${encodeURIComponent(name)}/checks${qs ? `?${qs}` : ""}`);
}

export function getServerScore(name: string) {
  return apiFetch<ScoreBreakdown>(`/api/servers/${encodeURIComponent(name)}/score`);
}

export function getStats() {
  return apiFetch<StatsResponse>("/api/stats");
}
