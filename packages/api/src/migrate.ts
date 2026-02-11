import pg from "pg";
import fs from "fs";
import path from "path";

const migrationsDir = path.join(import.meta.dirname, "..", "migrations");

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL not set");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  // Ensure _migrations table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id    SERIAL PRIMARY KEY,
      name  TEXT UNIQUE NOT NULL,
      run_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows: done } = await client.query("SELECT name FROM _migrations ORDER BY name");
  const applied = new Set(done.map((r: any) => r.name));

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`⏭  ${file} (already applied)`);
      continue;
    }
    console.log(`▶  Running ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await client.query(sql);
    await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
    console.log(`✅ ${file}`);
  }

  await client.end();
  console.log("Migration complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
