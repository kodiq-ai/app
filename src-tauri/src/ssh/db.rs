use super::SshConnectionConfig;
use crate::error::KodiqError;
use crate::state::DbState;
use serde::{Deserialize, Serialize};

// ── Saved Connection ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedSshConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: String,
    pub private_key_path: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub last_connected: Option<i64>,
    pub connect_count: i64,
}

/// Save a new SSH connection config to DB.
#[tauri::command]
pub fn ssh_save_connection(
    config: SshConnectionConfig,
    db: tauri::State<DbState>,
) -> Result<SavedSshConnection, KodiqError> {
    let conn = db.connection.lock()?;
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO ssh_connections (id, name, host, port, username, auth_method, private_key_path, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
         ON CONFLICT(id) DO UPDATE SET name=?2, host=?3, port=?4, username=?5, auth_method=?6, private_key_path=?7, updated_at=?8",
        rusqlite::params![
            config.id,
            config.name,
            config.host,
            config.port,
            config.username,
            config.auth_method.to_string(),
            config.private_key_path,
            now,
        ],
    )?;

    Ok(SavedSshConnection {
        id: config.id,
        name: config.name,
        host: config.host,
        port: config.port,
        username: config.username,
        auth_method: config.auth_method.to_string(),
        private_key_path: config.private_key_path,
        created_at: now,
        updated_at: now,
        last_connected: None,
        connect_count: 0,
    })
}

/// Delete a saved SSH connection.
#[tauri::command]
pub fn ssh_delete_connection(id: String, db: tauri::State<DbState>) -> Result<(), KodiqError> {
    let conn = db.connection.lock()?;
    conn.execute("DELETE FROM ssh_connections WHERE id = ?1", rusqlite::params![id])?;
    Ok(())
}

/// List all saved SSH connections.
#[tauri::command]
pub fn ssh_list_saved_connections(
    db: tauri::State<DbState>,
) -> Result<Vec<SavedSshConnection>, KodiqError> {
    let conn = db.connection.lock()?;
    let mut stmt = conn.prepare(
        "SELECT id, name, host, port, username, auth_method, private_key_path,
                created_at, updated_at, last_connected, connect_count
         FROM ssh_connections ORDER BY last_connected DESC NULLS LAST, name ASC",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(SavedSshConnection {
            id: row.get(0)?,
            name: row.get(1)?,
            host: row.get(2)?,
            port: row.get::<_, i64>(3)? as u16,
            username: row.get(4)?,
            auth_method: row.get(5)?,
            private_key_path: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            last_connected: row.get(9)?,
            connect_count: row.get(10)?,
        })
    })?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

// ── Port Forward ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshPortForward {
    pub id: String,
    pub connection_id: String,
    pub local_port: u16,
    pub remote_host: String,
    pub remote_port: u16,
    pub auto_start: bool,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewPortForward {
    pub connection_id: String,
    pub local_port: u16,
    pub remote_host: Option<String>,
    pub remote_port: u16,
    pub auto_start: Option<bool>,
}

/// Save a port forward rule.
#[tauri::command]
pub fn ssh_save_port_forward(
    forward: NewPortForward,
    db: tauri::State<DbState>,
) -> Result<SshPortForward, KodiqError> {
    let conn = db.connection.lock()?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    let remote_host = forward.remote_host.unwrap_or_else(|| "localhost".to_string());
    let auto_start = forward.auto_start.unwrap_or(false);

    conn.execute(
        "INSERT INTO ssh_port_forwards (id, connection_id, local_port, remote_host, remote_port, auto_start, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            id,
            forward.connection_id,
            forward.local_port as i64,
            remote_host,
            forward.remote_port as i64,
            auto_start as i64,
            now,
        ],
    )?;

    Ok(SshPortForward {
        id,
        connection_id: forward.connection_id,
        local_port: forward.local_port,
        remote_host,
        remote_port: forward.remote_port,
        auto_start,
        created_at: now,
    })
}

/// Delete a port forward rule.
#[tauri::command]
pub fn ssh_delete_port_forward(id: String, db: tauri::State<DbState>) -> Result<(), KodiqError> {
    let conn = db.connection.lock()?;
    conn.execute("DELETE FROM ssh_port_forwards WHERE id = ?1", rusqlite::params![id])?;
    Ok(())
}

/// List port forwards for a connection.
#[tauri::command]
pub fn ssh_list_port_forwards(
    connection_id: String,
    db: tauri::State<DbState>,
) -> Result<Vec<SshPortForward>, KodiqError> {
    let conn = db.connection.lock()?;
    let mut stmt = conn.prepare(
        "SELECT id, connection_id, local_port, remote_host, remote_port, auto_start, created_at
         FROM ssh_port_forwards WHERE connection_id = ?1 ORDER BY local_port",
    )?;

    let rows = stmt.query_map(rusqlite::params![connection_id], |row| {
        Ok(SshPortForward {
            id: row.get(0)?,
            connection_id: row.get(1)?,
            local_port: row.get::<_, i64>(2)? as u16,
            remote_host: row.get(3)?,
            remote_port: row.get::<_, i64>(4)? as u16,
            auto_start: row.get::<_, i64>(5)? != 0,
            created_at: row.get(6)?,
        })
    })?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}
