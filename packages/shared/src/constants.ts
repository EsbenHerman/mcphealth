import type { ScoreTierInfo } from "./types.js";

// ── Check intervals (ms) ───────────────────────────

export const CHECK_INTERVAL_CONNECTION = 15 * 60 * 1000; // 15 min
export const CHECK_INTERVAL_SCHEMA = 60 * 60 * 1000; // 1 hour
export const CHECK_INTERVAL_COMPLIANCE = 6 * 60 * 60 * 1000; // 6 hours
export const REGISTRY_SYNC_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

// ── Trust score weights ─────────────────────────────

export const SCORE_WEIGHTS = {
  availability: 0.35,
  latency: 0.15,
  schemaStability: 0.20,
  protocolCompliance: 0.15,
  metadataQuality: 0.10,
  freshness: 0.05,
} as const;

export const MAX_SCORE = 100;
export const LOCAL_ONLY_MAX_SCORE = 60;

// ── Score tiers ─────────────────────────────────────

export const SCORE_TIERS: ScoreTierInfo[] = [
  { tier: "excellent", label: "Excellent", emoji: "🟢", min: 90, max: 100 },
  { tier: "good", label: "Good", emoji: "🟡", min: 70, max: 89 },
  { tier: "fair", label: "Fair", emoji: "🟠", min: 50, max: 69 },
  { tier: "poor", label: "Poor", emoji: "🔴", min: 0, max: 49 },
];

// ── MCP client info ─────────────────────────────────

export const MCP_CLIENT_NAME = "mcphealth";
export const MCP_CLIENT_VERSION = "0.1.0";

// ── Registry ────────────────────────────────────────

export const REGISTRY_BASE_URL = "https://registry.modelcontextprotocol.io";
