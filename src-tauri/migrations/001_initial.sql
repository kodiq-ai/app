-- ═══════════════════════════════════════════════════════════
-- Kodiq Initial Schema — v1
-- ═══════════════════════════════════════════════════════════

-- Projects
CREATE TABLE projects (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    path         TEXT NOT NULL UNIQUE,
    created_at   INTEGER NOT NULL,
    last_opened  INTEGER NOT NULL,
    open_count   INTEGER DEFAULT 1,
    default_cli  TEXT,
    settings     TEXT
);

CREATE INDEX idx_projects_last_opened ON projects(last_opened DESC);

-- Terminal sessions (for restore after restart)
CREATE TABLE terminal_sessions (
    id           TEXT PRIMARY KEY,
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label        TEXT NOT NULL,
    command      TEXT,
    cwd          TEXT,
    sort_order   INTEGER DEFAULT 0,
    created_at   INTEGER NOT NULL,
    closed_at    INTEGER,
    is_active    INTEGER DEFAULT 1
);

CREATE INDEX idx_sessions_project ON terminal_sessions(project_id, is_active);

-- Command history (searchable across all sessions)
CREATE TABLE command_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id   TEXT REFERENCES terminal_sessions(id) ON DELETE SET NULL,
    command      TEXT NOT NULL,
    cli_name     TEXT,
    exit_code    INTEGER,
    duration_ms  INTEGER,
    timestamp    INTEGER NOT NULL
);

CREATE INDEX idx_history_project ON command_history(project_id, timestamp DESC);
CREATE INDEX idx_history_command ON command_history(command);

-- CLI profiles (saved configurations per CLI tool)
CREATE TABLE cli_profiles (
    id           TEXT PRIMARY KEY,
    cli_name     TEXT NOT NULL,
    profile_name TEXT NOT NULL,
    config       TEXT NOT NULL,
    is_default   INTEGER DEFAULT 0,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_cli_profiles_unique ON cli_profiles(cli_name, profile_name);

-- Snippets / saved prompts
CREATE TABLE snippets (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,
    cli_name     TEXT,
    tags         TEXT,
    usage_count  INTEGER DEFAULT 0,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);

CREATE INDEX idx_snippets_usage ON snippets(usage_count DESC);

-- AI conversations (parsed from CLI output)
CREATE TABLE ai_conversations (
    id           TEXT PRIMARY KEY,
    project_id   TEXT REFERENCES projects(id) ON DELETE CASCADE,
    session_id   TEXT REFERENCES terminal_sessions(id) ON DELETE SET NULL,
    cli_name     TEXT NOT NULL,
    title        TEXT,
    started_at   INTEGER NOT NULL,
    ended_at     INTEGER,
    message_count INTEGER DEFAULT 0,
    summary      TEXT
);

CREATE INDEX idx_conversations_project ON ai_conversations(project_id, started_at DESC);

CREATE TABLE ai_messages (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id  TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role             TEXT NOT NULL,
    content          TEXT NOT NULL,
    tokens_used      INTEGER,
    cost_usd         REAL,
    timestamp        INTEGER NOT NULL
);

CREATE INDEX idx_messages_conversation ON ai_messages(conversation_id, timestamp);

-- Git cache (avoid hitting git CLI every render)
CREATE TABLE git_cache (
    project_id   TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    branch       TEXT,
    commit_hash  TEXT,
    status_json  TEXT,
    stats_json   TEXT,
    updated_at   INTEGER NOT NULL
);

-- User settings (key-value for flexibility)
CREATE TABLE settings (
    key          TEXT PRIMARY KEY,
    value        TEXT NOT NULL,
    updated_at   INTEGER NOT NULL
);
