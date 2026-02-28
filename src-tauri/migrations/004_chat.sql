-- Chat messages history
CREATE TABLE chat_messages (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL,
    role        TEXT NOT NULL,        -- 'user' | 'assistant'
    content     TEXT NOT NULL,
    provider    TEXT NOT NULL,        -- 'claude' | 'gemini' | 'codex'
    created_at  INTEGER NOT NULL
);

CREATE INDEX idx_chat_messages_project ON chat_messages(project_id, created_at);
