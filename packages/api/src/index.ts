import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import PgBoss from "pg-boss";
import { syncRegistry } from "./registry-sync.js";

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
  });
}

const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`MCPHealth API running on http://localhost:${info.port}`);
});
