-- 001_initial_schema.sql
-- MCPHealth core tables

CREATE TABLE IF NOT EXISTS _migrations (
  id    SERIAL PRIMARY KEY,
  name  TEXT UNIQUE NOT NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE servers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_name   TEXT UNIQUE NOT NULL,
  title           TEXT,
  description     TEXT,
  version         TEXT,
  repo_url        TEXT,
  website_url     TEXT,
  icon_url        TEXT,
  transport_type  TEXT NOT NULL,
  remote_url      TEXT,
  registry_status TEXT NOT NULL,
  published_at    TIMESTAMPTZ,
  registry_updated_at TIMESTAMPTZ,
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  trust_score     INTEGER,
  current_status  TEXT DEFAULT 'unknown',
  uptime_24h      REAL,
  uptime_7d       REAL,
  uptime_30d      REAL,
  latency_p50     INTEGER,
  latency_p95     INTEGER
);

CREATE TABLE health_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id       UUID NOT NULL REFERENCES servers(id),
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT NOT NULL,
  latency_ms      INTEGER,
  error_message   TEXT,
  tool_count      INTEGER,
  resource_count  INTEGER,
  prompt_count    INTEGER,
  tools_hash      TEXT,
  protocol_version TEXT,
  compliance_pass BOOLEAN,
  check_level     TEXT NOT NULL
);

CREATE TABLE schema_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id       UUID NOT NULL REFERENCES servers(id),
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  tools_json      JSONB,
  resources_json  JSONB,
  prompts_json    JSONB,
  tools_hash      TEXT NOT NULL
);

CREATE TABLE score_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id       UUID NOT NULL REFERENCES servers(id),
  scored_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_score     INTEGER NOT NULL,
  availability_score  REAL,
  latency_score       REAL,
  stability_score     REAL,
  compliance_score    REAL,
  metadata_score      REAL,
  freshness_score     REAL
);

CREATE INDEX idx_checks_server_time ON health_checks(server_id, checked_at DESC);
CREATE INDEX idx_servers_score ON servers(trust_score DESC);
CREATE INDEX idx_servers_status ON servers(current_status);
CREATE INDEX idx_score_history_server ON score_history(server_id, scored_at DESC);
