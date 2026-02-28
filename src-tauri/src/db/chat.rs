use crate::error::KodiqError;
use crate::state::DbState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub project_id: String,
    pub role: String,
    pub content: String,
    pub provider: String,
    pub created_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct NewChatMessage {
    pub id: String,
    pub project_id: String,
    pub role: String,
    pub content: String,
    pub provider: String,
}

// ── Pure functions ───────────────────────────────────────────────────

pub fn list(
    conn: &rusqlite::Connection,
    project_id: &str,
    limit: i64,
) -> Result<Vec<ChatMessage>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, role, content, provider, created_at
         FROM chat_messages
         WHERE project_id = ?1
         ORDER BY created_at ASC
         LIMIT ?2",
    )?;
    let rows = stmt.query_map(rusqlite::params![project_id, limit], map_row)?;
    rows.collect()
}

pub fn save(
    conn: &rusqlite::Connection,
    msg: &NewChatMessage,
) -> Result<ChatMessage, rusqlite::Error> {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()
        as i64;

    conn.execute(
        "INSERT INTO chat_messages (id, project_id, role, content, provider, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![msg.id, msg.project_id, msg.role, msg.content, msg.provider, now],
    )?;

    Ok(ChatMessage {
        id: msg.id.clone(),
        project_id: msg.project_id.clone(),
        role: msg.role.clone(),
        content: msg.content.clone(),
        provider: msg.provider.clone(),
        created_at: now,
    })
}

pub fn clear(conn: &rusqlite::Connection, project_id: &str) -> Result<u64, rusqlite::Error> {
    let count = conn.execute(
        "DELETE FROM chat_messages WHERE project_id = ?1",
        rusqlite::params![project_id],
    )?;
    Ok(count as u64)
}

fn map_row(row: &rusqlite::Row) -> Result<ChatMessage, rusqlite::Error> {
    Ok(ChatMessage {
        id: row.get(0)?,
        project_id: row.get(1)?,
        role: row.get(2)?,
        content: row.get(3)?,
        provider: row.get(4)?,
        created_at: row.get(5)?,
    })
}

// ── Tauri Commands ───────────────────────────────────────────────────

#[tauri::command]
pub fn db_list_chat_messages(
    db: tauri::State<DbState>,
    project_id: String,
    limit: Option<i64>,
) -> Result<Vec<ChatMessage>, KodiqError> {
    let conn = db.connection.lock()?;
    Ok(list(&conn, &project_id, limit.unwrap_or(200))?)
}

#[tauri::command]
pub fn db_save_chat_message(
    db: tauri::State<DbState>,
    message: NewChatMessage,
) -> Result<ChatMessage, KodiqError> {
    let conn = db.connection.lock()?;
    Ok(save(&conn, &message)?)
}

#[tauri::command]
pub fn db_clear_chat(db: tauri::State<DbState>, project_id: String) -> Result<u64, KodiqError> {
    let conn = db.connection.lock()?;
    Ok(clear(&conn, &project_id)?)
}
