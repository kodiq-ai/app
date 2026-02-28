-- SSH connection configs (saved, no passwords)
CREATE TABLE ssh_connections (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    host            TEXT NOT NULL,
    port            INTEGER NOT NULL DEFAULT 22,
    username        TEXT NOT NULL,
    auth_method     TEXT NOT NULL DEFAULT 'key',
    private_key_path TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    last_connected  INTEGER,
    connect_count   INTEGER NOT NULL DEFAULT 0
);

-- Port forwarding rules (persisted per connection)
CREATE TABLE ssh_port_forwards (
    id              TEXT PRIMARY KEY,
    connection_id   TEXT NOT NULL REFERENCES ssh_connections(id) ON DELETE CASCADE,
    local_port      INTEGER NOT NULL,
    remote_host     TEXT NOT NULL DEFAULT 'localhost',
    remote_port     INTEGER NOT NULL,
    auto_start      INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL
);
