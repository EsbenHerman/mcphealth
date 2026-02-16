-- 004_smithery_integration.sql
-- Add Smithery.ai registry support

-- Add new columns to servers table
ALTER TABLE servers ADD COLUMN registry_source TEXT NOT NULL DEFAULT 'official';
ALTER TABLE servers ADD COLUMN external_use_count INTEGER DEFAULT NULL;
ALTER TABLE servers ADD COLUMN smithery_id TEXT DEFAULT NULL;

-- Add constraint to ensure registry_source is either 'official' or 'smithery'
ALTER TABLE servers ADD CONSTRAINT servers_registry_source_check 
  CHECK (registry_source IN ('official', 'smithery'));

-- Create index on registry_source for filtering
CREATE INDEX idx_servers_registry_source ON servers(registry_source);

-- Create index on smithery_id for deduplication
CREATE INDEX idx_servers_smithery_id ON servers(smithery_id) WHERE smithery_id IS NOT NULL;

-- Create composite index on external_use_count for popularity sorting
CREATE INDEX idx_servers_external_use_count ON servers(external_use_count DESC) WHERE external_use_count IS NOT NULL;

-- Add popularity_score column to score_history table
ALTER TABLE score_history ADD COLUMN popularity_score REAL;