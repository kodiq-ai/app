use crate::state::DbState;
use std::collections::HashMap;

// ── Pure functions ───────────────────────────────────────────────────

pub fn get(conn: &rusqlite::Connection, key: &str) -> Result<Option<String>, rusqlite::Error> {
    conn.query_row("SELECT value FROM settings WHERE key = ?1", rusqlite::params![key], |row| {
        row.get(0)
    })
    .optional()
}

pub fn set(conn: &rusqlite::Connection, key: &str, value: &str) -> Result<(), rusqlite::Error> {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()
        as i64;

    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
        rusqlite::params![key, value, now],
    )?;
    Ok(())
}

pub fn get_all(conn: &rusqlite::Connection) -> Result<HashMap<String, String>, rusqlite::Error> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let rows =
        stmt.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?;
    let mut map = HashMap::new();
    for row in rows {
        let (k, v) = row?;
        map.insert(k, v);
    }
    Ok(map)
}

// Bring the `optional()` method into scope
use rusqlite::OptionalExtension;

// ── Tauri Commands ───────────────────────────────────────────────────

#[tauri::command]
pub fn db_get_setting(db: tauri::State<DbState>, key: String) -> Result<Option<String>, String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    get(&conn, &key).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn db_set_setting(db: tauri::State<DbState>, key: String, value: String) -> Result<(), String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    set(&conn, &key, &value).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn db_get_all_settings(db: tauri::State<DbState>) -> Result<HashMap<String, String>, String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    get_all(&conn).map_err(|e| format!("DB error: {}", e))
}

// ── Tests ─────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    fn test_db() -> rusqlite::Connection {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        db::migrations::run_migrations(&conn).unwrap();
        conn
    }

    #[test]
    fn test_set_and_get() {
        let conn = test_db();
        set(&conn, "fontSize", "14").unwrap();
        let val = get(&conn, "fontSize").unwrap();
        assert_eq!(val, Some("14".to_string()));
    }

    #[test]
    fn test_get_missing() {
        let conn = test_db();
        let val = get(&conn, "nonexistent").unwrap();
        assert_eq!(val, None);
    }

    #[test]
    fn test_upsert() {
        let conn = test_db();
        set(&conn, "theme", "dark").unwrap();
        set(&conn, "theme", "light").unwrap();
        let val = get(&conn, "theme").unwrap();
        assert_eq!(val, Some("light".to_string()));
    }

    #[test]
    fn test_get_all() {
        let conn = test_db();
        set(&conn, "a", "1").unwrap();
        set(&conn, "b", "2").unwrap();
        let all = get_all(&conn).unwrap();
        assert_eq!(all.len(), 2);
        assert_eq!(all["a"], "1");
        assert_eq!(all["b"], "2");
    }
}
