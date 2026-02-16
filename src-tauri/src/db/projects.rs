use crate::state::DbState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: i64,
    pub last_opened: i64,
    pub open_count: i32,
    pub default_cli: Option<String>,
    pub settings: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProjectPatch {
    pub name: Option<String>,
    pub default_cli: Option<String>,
    pub settings: Option<String>,
}

// ── Pure functions (testable without Tauri) ──────────────────────────

pub fn list(conn: &rusqlite::Connection) -> Result<Vec<Project>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, name, path, created_at, last_opened, open_count, default_cli, settings
         FROM projects ORDER BY last_opened DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            created_at: row.get(3)?,
            last_opened: row.get(4)?,
            open_count: row.get(5)?,
            default_cli: row.get(6)?,
            settings: row.get(7)?,
        })
    })?;
    rows.collect()
}

pub fn create(
    conn: &rusqlite::Connection,
    name: &str,
    path: &str,
) -> Result<Project, rusqlite::Error> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "INSERT INTO projects (id, name, path, created_at, last_opened, open_count)
         VALUES (?1, ?2, ?3, ?4, ?5, 1)",
        rusqlite::params![id, name, path, now, now],
    )?;

    Ok(Project {
        id,
        name: name.to_string(),
        path: path.to_string(),
        created_at: now,
        last_opened: now,
        open_count: 1,
        default_cli: None,
        settings: None,
    })
}

pub fn touch(conn: &rusqlite::Connection, path: &str) -> Result<(), rusqlite::Error> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "UPDATE projects SET last_opened = ?1, open_count = open_count + 1 WHERE path = ?2",
        rusqlite::params![now, path],
    )?;
    Ok(())
}

pub fn update(
    conn: &rusqlite::Connection,
    id: &str,
    patch: &ProjectPatch,
) -> Result<(), rusqlite::Error> {
    if let Some(ref name) = patch.name {
        conn.execute(
            "UPDATE projects SET name = ?1 WHERE id = ?2",
            rusqlite::params![name, id],
        )?;
    }
    if let Some(ref cli) = patch.default_cli {
        conn.execute(
            "UPDATE projects SET default_cli = ?1 WHERE id = ?2",
            rusqlite::params![cli, id],
        )?;
    }
    if let Some(ref s) = patch.settings {
        conn.execute(
            "UPDATE projects SET settings = ?1 WHERE id = ?2",
            rusqlite::params![s, id],
        )?;
    }
    Ok(())
}

pub fn get_or_create(
    conn: &rusqlite::Connection,
    name: &str,
    path: &str,
) -> Result<Project, rusqlite::Error> {
    use rusqlite::OptionalExtension;

    let existing: Option<Project> = conn
        .query_row(
            "SELECT id, name, path, created_at, last_opened, open_count, default_cli, settings
             FROM projects WHERE path = ?1",
            rusqlite::params![path],
            |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    path: row.get(2)?,
                    created_at: row.get(3)?,
                    last_opened: row.get(4)?,
                    open_count: row.get(5)?,
                    default_cli: row.get(6)?,
                    settings: row.get(7)?,
                })
            },
        )
        .optional()?;

    match existing {
        Some(p) => {
            touch(conn, path)?;
            Ok(Project {
                open_count: p.open_count + 1,
                ..p
            })
        }
        None => create(conn, name, path),
    }
}

// ── Tauri Commands ───────────────────────────────────────────────────

#[tauri::command]
pub fn db_get_or_create_project(
    db: tauri::State<DbState>,
    name: String,
    path: String,
) -> Result<Project, String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    get_or_create(&conn, &name, &path).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn db_list_projects(db: tauri::State<DbState>) -> Result<Vec<Project>, String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    list(&conn).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn db_create_project(
    db: tauri::State<DbState>,
    name: String,
    path: String,
) -> Result<Project, String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    create(&conn, &name, &path).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn db_touch_project(db: tauri::State<DbState>, path: String) -> Result<(), String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    touch(&conn, &path).map_err(|e| format!("DB error: {}", e))
}

#[tauri::command]
pub fn db_update_project(
    db: tauri::State<DbState>,
    id: String,
    patch: ProjectPatch,
) -> Result<(), String> {
    let conn = db.connection.lock().map_err(|e| format!("Lock error: {}", e))?;
    update(&conn, &id, &patch).map_err(|e| format!("DB error: {}", e))
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
    fn test_create_and_list() {
        let conn = test_db();
        let project = create(&conn, "test-project", "/tmp/test").unwrap();
        assert_eq!(project.name, "test-project");
        assert_eq!(project.path, "/tmp/test");
        assert_eq!(project.open_count, 1);

        let projects = list(&conn).unwrap();
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].name, "test-project");
    }

    #[test]
    fn test_unique_path() {
        let conn = test_db();
        create(&conn, "first", "/tmp/same").unwrap();
        let result = create(&conn, "second", "/tmp/same");
        assert!(result.is_err()); // UNIQUE constraint
    }

    #[test]
    fn test_touch() {
        let conn = test_db();
        create(&conn, "proj", "/tmp/proj").unwrap();
        touch(&conn, "/tmp/proj").unwrap();

        let projects = list(&conn).unwrap();
        assert_eq!(projects[0].open_count, 2);
    }

    #[test]
    fn test_update() {
        let conn = test_db();
        let project = create(&conn, "old-name", "/tmp/update").unwrap();
        update(
            &conn,
            &project.id,
            &ProjectPatch {
                name: Some("new-name".to_string()),
                default_cli: Some("claude".to_string()),
                settings: None,
            },
        )
        .unwrap();

        let projects = list(&conn).unwrap();
        assert_eq!(projects[0].name, "new-name");
        assert_eq!(projects[0].default_cli, Some("claude".to_string()));
    }

    #[test]
    fn test_get_or_create_new() {
        let conn = test_db();
        let p = get_or_create(&conn, "new-proj", "/tmp/new").unwrap();
        assert_eq!(p.name, "new-proj");
        assert_eq!(p.path, "/tmp/new");
        assert_eq!(p.open_count, 1);

        let projects = list(&conn).unwrap();
        assert_eq!(projects.len(), 1);
    }

    #[test]
    fn test_get_or_create_existing() {
        let conn = test_db();
        create(&conn, "existing", "/tmp/existing").unwrap();

        let p = get_or_create(&conn, "existing", "/tmp/existing").unwrap();
        assert_eq!(p.open_count, 2); // touched

        let projects = list(&conn).unwrap();
        assert_eq!(projects.len(), 1); // no duplicate
    }
}
