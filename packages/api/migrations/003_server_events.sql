CREATE TABLE server_events (
  id          SERIAL PRIMARY KEY,
  server_id   UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_server_events_server_created ON server_events (server_id, created_at DESC);
CREATE INDEX idx_server_events_type_created ON server_events (event_type, created_at DESC);
