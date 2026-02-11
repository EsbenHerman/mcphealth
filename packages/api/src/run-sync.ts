import "dotenv/config";
import { syncRegistry } from "./registry-sync.js";
import pool from "./db.js";

syncRegistry()
  .then(async (count) => {
    console.log(`Done: ${count} servers synced`);
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Sync failed:", err);
    await pool.end();
    process.exit(1);
  });
