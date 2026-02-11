// ── Server ──────────────────────────────────────────

export type TransportType = "streamable-http" | "sse" | "stdio" | "mixed";
export type ServerStatus = "up" | "down" | "degraded" | "unknown";
export type RegistryStatus = "active" | "deprecated" | "deleted";
export type CheckLevel = "connection" | "schema" | "compliance";
export type CheckStatus = "up" | "down" | "error" | "timeout";

export interface Server {
  id: string;
  registryName: string;
  title: string | null;
  description: string | null;
  version: string | null;
  repoUrl: string | null;
  websiteUrl: string | null;
  iconUrl: string | null;
  transportType: TransportType;
  remoteUrl: string | null;
  registryStatus: RegistryStatus;
  publishedAt: string | null;
  registryUpdatedAt: string | null;
  firstSeenAt: string;
  lastSyncedAt: string;
  trustScore: number | null;
  currentStatus: ServerStatus;
  uptime24h: number | null;
  uptime7d: number | null;
  uptime30d: number | null;
  latencyP50: number | null;
  latencyP95: number | null;
}

export interface HealthCheck {
  id: string;
  serverId: string;
  checkedAt: string;
  status: CheckStatus;
  latencyMs: number | null;
  errorMessage: string | null;
  toolCount: number | null;
  resourceCount: number | null;
  promptCount: number | null;
  toolsHash: string | null;
  protocolVersion: string | null;
  compliancePass: boolean | null;
  checkLevel: CheckLevel;
}

export interface SchemaSnapshot {
  id: string;
  serverId: string;
  capturedAt: string;
  toolsJson: unknown;
  resourcesJson: unknown;
  promptsJson: unknown;
  toolsHash: string;
}

export interface ScoreHistory {
  id: string;
  serverId: string;
  scoredAt: string;
  totalScore: number;
  availabilityScore: number | null;
  latencyScore: number | null;
  stabilityScore: number | null;
  complianceScore: number | null;
  metadataScore: number | null;
  freshnessScore: number | null;
}

// ── Score Tier ──────────────────────────────────────

export type ScoreTier = "excellent" | "good" | "fair" | "poor";

export interface ScoreTierInfo {
  tier: ScoreTier;
  label: string;
  emoji: string;
  min: number;
  max: number;
}
