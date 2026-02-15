use crate::state::DbState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: i64,
    pub project_id: String,
    pub session_id: Option<String>,
    pub command: String,
    pub cli_name: Option<String>,
    pub exit_code: Option<i32>,
    pub duration_ms: Option<i64>,
    pub timestamp: i64,
}

#[derive(Debug, Deserialize)]
pub struct NewHistoryEntry {
    pub project_id: String,
    pub session_id: Option<String>,
    pub command: String,
    pub cli_name: Option<String>,
    pub exit_code: Option<i32>,
    pub duration_ms: Option<i64>,
}

// ── Pure functions ───────────────────────────────────────────────────

pub fn search(
    conn: &rusqlite::Connection,
    query: &str,
    project_id: Option<&str>,
) -> Result<Vec<HistoryEntry>, rusqlite::Error> {
    let pattern = format!("%{}%", query);

    if let Some(pid) = project_id {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, session_id, command, cli_name, exit_code, duration_ms, timestamp
             FROM command_history WHERE project_id = ?1 AND command LIKE ?2
             ORDER BY timestamp DESC LIMIT 100",
        )?;
        let rows = stmt.query_map(rusqlite::params![pid, pattern], map_row)?;
        rows.collect()
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, session_id, command, cli_name, exit_code, duration_ms, timestamp
             FROM command_history WHERE command LIKE ?1
             ORDER BY timestamp DESC LIMIT 100",
        )?;
        let rows = stmt.query_map(rusqlite::params![pattern], map_row)?;
        rows.collect()
    }
}

pub fn add(
    conn: &rusqlite::Connection,
    entry: &NewHistoryEntry,
) -> Result<(), rusqlite::Error> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "INSERT INTO command_history
         (project_id, session_id, command, cli_name, exit_code, duration_ms, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            entry.project_id,
            entry.session_id,
            entry.command,
            entry.cli_name,
            entry.exit_code,
            entry.duration_ms,
            now,
        ],
    )?;
    Ok(())
}

fn map_row(row: &rusqlite::Row) -> Result<HistoryEntry, rusqlite::Error> {
    Ok(HistoryEntry {
        id: row.get(0)?,
        project_id: row.get(1)?,
        session_id: row.get(2)?,
        command: row.get(3)?,
        cli_name: row.get(4)?,
        exit_code: row.get(5)?,
        duration_ms: row.get(6)?,
        timestamp: row.get(7)?,
    })
}

// ── Tauri Commands ───────────────────────────────────────────────────

#[tauri::command]
pub fn db_search_history(
    db: tauri::State<DbState>,
    query: String,
    project_id: Option<String>,
) -> Result<Vec<HistoryEntry>, String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    search(&conn, &query, project_id.as_deref()).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn db_add_history(
    db: tauri::State<DbState>,
    entry: NewHistoryEntry,
) -> Result<(), String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    add(&conn, &entry).map_err(|e| format!("DB error: {}", e))
}
