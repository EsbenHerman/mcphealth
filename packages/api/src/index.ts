import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import PgBoss from "pg-boss";
import { syncRegistry } from "./registry-sync.js";
import { checkAndRecord, checkAllRemoteServers } from "./health-checker.ts";
import { getScoreBreakdown, scoreAllServers } from "./trust-score.ts";
import pool from "./db.ts";

const app = new Hono();

app.use("/*", cors());

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

// Score breakdown endpoint
app.get("/api/servers/:name{.+}/score", async (c) => {
  const name = c.req.param("name");
  try {
    const breakdown = await getScoreBreakdown(name);
    if (!breakdown) return c.json({ ok: false, error: "Server not found" }, 404);
    return c.json({ ok: true, ...breakdown });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
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

// pg-boss scheduler
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  const boss = new PgBoss(databaseUrl);

  boss.on("error", (err) => console.error("[pg-boss] error:", err));

  boss.start().then(async () => {
    console.log("[pg-boss] started");

    const SYNC_JOB = "registry-sync";

    // Schedule every 6 hours
    await boss.schedule(SYNC_JOB, "0 */6 * * *");
    console.log("[pg-boss] scheduled registry-sync every 6h");

    await boss.work(SYNC_JOB, async () => {
      console.log("[pg-boss] running registry-sync job...");
      const count = await syncRegistry();
      console.log(`[pg-boss] registry-sync done — ${count} servers`);
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
