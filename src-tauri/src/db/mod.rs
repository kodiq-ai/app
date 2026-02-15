pub mod migrations;
pub mod projects;
pub mod sessions;
pub mod settings;
pub mod history;
pub mod snippets;

use crate::state::DbState;

/// Initialize the database: open/create file, run migrations.
pub fn init() -> Result<DbState, String> {
    let db_dir = dirs::config_dir()
        .ok_or("Cannot find config directory")?
        .join("kodiq");

    std::fs::create_dir_all(&db_dir)
        .map_err(|e| format!("Cannot create config dir: {}", e))?;

    let db_path = db_dir.join("kodiq.db");
    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Cannot open database: {}", e))?;

    // Enable WAL mode for better concurrent read performance
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("Failed to set pragmas: {}", e))?;

    migrations::run_migrations(&conn)?;

    log::info!("Database initialized at {:?}", db_path);
    Ok(DbState::new(conn))
}

/// Initialize an in-memory database (for testing).
#[cfg(test)]
pub fn init_test() -> DbState {
    let conn = rusqlite::Connection::open_in_memory().unwrap();
    conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
    migrations::run_migrations(&conn).unwrap();
    DbState::new(conn)
}
