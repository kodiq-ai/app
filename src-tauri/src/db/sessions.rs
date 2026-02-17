use crate::state::DbState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TerminalSession {
    pub id: String,
    pub project_id: String,
    pub label: String,
    pub command: Option<String>,
    pub cwd: Option<String>,
    pub sort_order: i32,
    pub created_at: i64,
    pub closed_at: Option<i64>,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct NewSession {
    pub id: String,
    pub project_id: String,
    pub label: String,
    pub command: Option<String>,
    pub cwd: Option<String>,
    pub sort_order: i32,
}

// ── Pure functions ───────────────────────────────────────────────────

pub fn list_active(
    conn: &rusqlite::Connection,
    project_id: &str,
) -> Result<Vec<TerminalSession>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, label, command, cwd, sort_order, created_at, closed_at, is_active
         FROM terminal_sessions WHERE project_id = ?1 AND is_active = 1
         ORDER BY sort_order",
    )?;
    let rows = stmt.query_map(rusqlite::params![project_id], |row| {
        Ok(TerminalSession {
            id: row.get(0)?,
            project_id: row.get(1)?,
            label: row.get(2)?,
            command: row.get(3)?,
            cwd: row.get(4)?,
            sort_order: row.get(5)?,
            created_at: row.get(6)?,
            closed_at: row.get(7)?,
            is_active: row.get::<_, i32>(8)? == 1,
        })
    })?;
    rows.collect()
}

pub fn save(conn: &rusqlite::Connection, session: &NewSession) -> Result<(), rusqlite::Error> {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()
        as i64;

    conn.execute(
        "INSERT OR REPLACE INTO terminal_sessions
         (id, project_id, label, command, cwd, sort_order, created_at, is_active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)",
        rusqlite::params![
            session.id,
            session.project_id,
            session.label,
            session.command,
            session.cwd,
            session.sort_order,
            now,
        ],
    )?;
    Ok(())
}

pub fn close(conn: &rusqlite::Connection, id: &str) -> Result<(), rusqlite::Error> {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()
        as i64;

    conn.execute(
        "UPDATE terminal_sessions SET is_active = 0, closed_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    )?;
    Ok(())
}

pub fn close_all_for_project(
    conn: &rusqlite::Connection,
    project_id: &str,
) -> Result<(), rusqlite::Error> {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()
        as i64;

    conn.execute(
        "UPDATE terminal_sessions SET is_active = 0, closed_at = ?1
         WHERE project_id = ?2 AND is_active = 1",
        rusqlite::params![now, project_id],
    )?;
    Ok(())
}

// ── Tauri Commands ───────────────────────────────────────────────────

#[tauri::command]
pub fn db_close_all_sessions(db: tauri::State<DbState>, project_id: String) -> Result<(), String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    close_all_for_project(&conn, &project_id).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn db_list_sessions(
    db: tauri::State<DbState>,
    project_id: String,
) -> Result<Vec<TerminalSession>, String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    list_active(&conn, &project_id).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn db_save_session(db: tauri::State<DbState>, session: NewSession) -> Result<(), String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    save(&conn, &session).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn db_close_session(db: tauri::State<DbState>, id: String) -> Result<(), String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    close(&conn, &id).map_err(|e| format!("DB error: {}", e))
}

// ── Tests ─────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{self, projects};

    fn test_db() -> rusqlite::Connection {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        db::migrations::run_migrations(&conn).unwrap();
        conn
    }

    fn make_session(id: &str, project_id: &str, label: &str, order: i32) -> NewSession {
        NewSession {
            id: id.to_string(),
            project_id: project_id.to_string(),
            label: label.to_string(),
            command: None,
            cwd: None,
            sort_order: order,
        }
    }

    #[test]
    fn test_save_and_list() {
        let conn = test_db();
        let project = projects::create(&conn, "proj", "/tmp/proj").unwrap();
        save(&conn, &make_session("s1", &project.id, "Tab 1", 0)).unwrap();
        save(&conn, &make_session("s2", &project.id, "Tab 2", 1)).unwrap();

        let active = list_active(&conn, &project.id).unwrap();
        assert_eq!(active.len(), 2);
        assert_eq!(active[0].label, "Tab 1");
        assert_eq!(active[1].label, "Tab 2");
    }

    #[test]
    fn test_close_session() {
        let conn = test_db();
        let project = projects::create(&conn, "proj", "/tmp/proj").unwrap();
        save(&conn, &make_session("s1", &project.id, "Tab 1", 0)).unwrap();

        close(&conn, "s1").unwrap();
        let active = list_active(&conn, &project.id).unwrap();
        assert_eq!(active.len(), 0);
    }

    #[test]
    fn test_close_all_for_project() {
        let conn = test_db();
        let project = projects::create(&conn, "proj", "/tmp/proj").unwrap();
        save(&conn, &make_session("s1", &project.id, "Tab 1", 0)).unwrap();
        save(&conn, &make_session("s2", &project.id, "Tab 2", 1)).unwrap();

        close_all_for_project(&conn, &project.id).unwrap();
        let active = list_active(&conn, &project.id).unwrap();
        assert_eq!(active.len(), 0);
    }
}
