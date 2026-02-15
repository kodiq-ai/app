use crate::state::DbState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Snippet {
    pub id: String,
    pub title: String,
    pub content: String,
    pub cli_name: Option<String>,
    pub tags: Option<String>,
    pub usage_count: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct NewSnippet {
    pub title: String,
    pub content: String,
    pub cli_name: Option<String>,
    pub tags: Option<String>,
}

// ── Pure functions ───────────────────────────────────────────────────

pub fn list(
    conn: &rusqlite::Connection,
    cli_name: Option<&str>,
) -> Result<Vec<Snippet>, rusqlite::Error> {
    if let Some(cli) = cli_name {
        let mut stmt = conn.prepare(
            "SELECT id, title, content, cli_name, tags, usage_count, created_at, updated_at
             FROM snippets WHERE cli_name = ?1 OR cli_name IS NULL
             ORDER BY usage_count DESC",
        )?;
        let rows = stmt.query_map(rusqlite::params![cli], map_row)?;
        rows.collect()
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, title, content, cli_name, tags, usage_count, created_at, updated_at
             FROM snippets ORDER BY usage_count DESC",
        )?;
        let rows = stmt.query_map([], map_row)?;
        rows.collect()
    }
}

pub fn create(
    conn: &rusqlite::Connection,
    snippet: &NewSnippet,
) -> Result<Snippet, rusqlite::Error> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "INSERT INTO snippets (id, title, content, cli_name, tags, usage_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7)",
        rusqlite::params![id, snippet.title, snippet.content, snippet.cli_name, snippet.tags, now, now],
    )?;

    Ok(Snippet {
        id,
        title: snippet.title.clone(),
        content: snippet.content.clone(),
        cli_name: snippet.cli_name.clone(),
        tags: snippet.tags.clone(),
        usage_count: 0,
        created_at: now,
        updated_at: now,
    })
}

pub fn use_snippet(conn: &rusqlite::Connection, id: &str) -> Result<Snippet, rusqlite::Error> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "UPDATE snippets SET usage_count = usage_count + 1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    )?;

    conn.query_row(
        "SELECT id, title, content, cli_name, tags, usage_count, created_at, updated_at
         FROM snippets WHERE id = ?1",
        rusqlite::params![id],
        map_row,
    )
}

fn map_row(row: &rusqlite::Row) -> Result<Snippet, rusqlite::Error> {
    Ok(Snippet {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        cli_name: row.get(3)?,
        tags: row.get(4)?,
        usage_count: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

// ── Tauri Commands ───────────────────────────────────────────────────

#[tauri::command]
pub fn db_list_snippets(
    db: tauri::State<DbState>,
    cli_name: Option<String>,
) -> Result<Vec<Snippet>, String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    list(&conn, cli_name.as_deref()).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn db_create_snippet(
    db: tauri::State<DbState>,
    snippet: NewSnippet,
) -> Result<Snippet, String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    create(&conn, &snippet).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn db_use_snippet(db: tauri::State<DbState>, id: String) -> Result<Snippet, String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    use_snippet(&conn, &id).map_err(|e| format!("DB error: {}", e))
}
