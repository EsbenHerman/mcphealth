-- 002_server_capabilities.sql
-- Extract tool/resource names from schema_snapshots for search

CREATE TABLE server_capabilities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id       UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  capability_type TEXT NOT NULL CHECK (capability_type IN ('tool', 'resource')),
  name            TEXT NOT NULL,
  description     TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_capabilities_server ON server_capabilities(server_id);
CREATE INDEX idx_capabilities_name ON server_capabilities(name);
CREATE INDEX idx_capabilities_type ON server_capabilities(capability_type);
CREATE UNIQUE INDEX idx_capabilities_unique ON server_capabilities(server_id, capability_type, name);

-- Backfill from existing schema_snapshots (latest snapshot per server)
INSERT INTO server_capabilities (server_id, capability_type, name, description, updated_at)
SELECT
  ss.server_id,
  'tool',
  tool->>'name',
  tool->>'description',
  ss.captured_at
FROM (
  SELECT DISTINCT ON (server_id) server_id, tools_json, captured_at
  FROM schema_snapshots
  WHERE tools_json IS NOT NULL
  ORDER BY server_id, captured_at DESC
) ss,
  jsonb_array_elements(ss.tools_json) AS tool
WHERE tool->>'name' IS NOT NULL
ON CONFLICT (server_id, capability_type, name) DO UPDATE
  SET description = EXCLUDED.description, updated_at = EXCLUDED.updated_at;

INSERT INTO server_capabilities (server_id, capability_type, name, description, updated_at)
SELECT
  ss.server_id,
  'resource',
  res->>'name',
  res->>'description',
  ss.captured_at
FROM (
  SELECT DISTINCT ON (server_id) server_id, resources_json, captured_at
  FROM schema_snapshots
  WHERE resources_json IS NOT NULL
  ORDER BY server_id, captured_at DESC
) ss,
  jsonb_array_elements(ss.resources_json) AS res
WHERE res->>'name' IS NOT NULL
ON CONFLICT (server_id, capability_type, name) DO UPDATE
  SET description = EXCLUDED.description, updated_at = EXCLUDED.updated_at;
