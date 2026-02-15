import type { Context, Next } from "hono";

// Sliding window rate limiter — in-memory, IP-based, no deps

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

// Cleanup stale entries every 60s
setInterval(() => {
  const cutoff = Date.now() - 120_000; // 2 min buffer
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 60_000);

type Tier = { limit: number; windowMs: number };

const TIER_60: Tier = { limit: 60, windowMs: 60_000 };
const TIER_120: Tier = { limit: 120, windowMs: 60_000 };

function getTier(path: string): Tier | null {
  // No limit
  if (
    path === "/health" ||
    path === "/" ||
    path.startsWith("/api/admin/") ||
    path.startsWith("/api/sync") ||
    path.startsWith("/api/check/")
  ) {
    return null;
  }

  // 60 req/min
  if (path === "/api/servers" || path === "/api/capabilities") {
    return TIER_60;
  }

  // 120 req/min (everything else: /api/servers/*, /api/stats, /api/feed, /api/badge/*)
  return TIER_120;
}

export function rateLimiter() {
  return async (c: Context, next: Next) => {
    const tier = getTier(c.req.path);
    if (!tier) return next();

    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";

    const key = `${ip}:${tier.limit}`;
    const now = Date.now();
    const windowStart = now - tier.windowMs;

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Slide window
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    const resetTime = Math.ceil((windowStart + tier.windowMs) / 1000);

    if (entry.timestamps.length >= tier.limit) {
      const retryAfter = Math.ceil((entry.timestamps[0] + tier.windowMs - now) / 1000);
      c.header("X-RateLimit-Limit", String(tier.limit));
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", String(resetTime));
      return c.json({ error: "Too many requests", retryAfter }, 429);
    }

    entry.timestamps.push(now);

    c.header("X-RateLimit-Limit", String(tier.limit));
    c.header("X-RateLimit-Remaining", String(tier.limit - entry.timestamps.length));
    c.header("X-RateLimit-Reset", String(resetTime));

    return next();
  };
}
