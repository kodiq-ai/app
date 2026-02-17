-- Migration 002: Add project_id to cli_profiles for per-project launch configs
-- project_id = NULL means global config, project_id = UUID means project-specific

ALTER TABLE cli_profiles ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE CASCADE;

-- Recreate unique index to include project_id
DROP INDEX IF EXISTS idx_cli_profiles_unique;
CREATE UNIQUE INDEX idx_cli_profiles_unique ON cli_profiles(cli_name, profile_name, COALESCE(project_id, '__global__'));
