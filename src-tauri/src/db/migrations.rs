use rusqlite::Connection;

pub struct Migration {
    pub version: u32,
    pub name: &'static str,
    pub sql: &'static str,
}

pub const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "initial_schema",
        sql: include_str!("../../migrations/001_initial.sql"),
    },
    Migration {
        version: 2,
        name: "launch_configs_project_id",
        sql: include_str!("../../migrations/002_launch_configs.sql"),
    },
];

pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            version     INTEGER PRIMARY KEY,
            name        TEXT NOT NULL,
            applied_at  INTEGER NOT NULL
        )",
    )
    .map_err(|e| format!("Failed to create migrations table: {}", e))?;

    let current: u32 = conn
        .query_row("SELECT COALESCE(MAX(version), 0) FROM _migrations", [], |r| r.get(0))
        .unwrap_or(0);

    for m in MIGRATIONS.iter().filter(|m| m.version > current) {
        conn.execute_batch(m.sql)
            .map_err(|e| format!("Migration {} ({}) failed: {}", m.version, m.name, e))?;

        let now =
            std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()
                as i64;

        conn.execute(
            "INSERT INTO _migrations (version, name, applied_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![m.version, m.name, now],
        )
        .map_err(|e| format!("Failed to record migration: {}", e))?;

        log::info!("Applied migration {}: {}", m.version, m.name);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrations_run_on_empty_db() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();

        let version: u32 =
            conn.query_row("SELECT MAX(version) FROM _migrations", [], |r| r.get(0)).unwrap();
        assert_eq!(version, 2);
    }

    #[test]
    fn test_migrations_idempotent() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        run_migrations(&conn).unwrap(); // Should not fail on second run

        let count: u32 =
            conn.query_row("SELECT COUNT(*) FROM _migrations", [], |r| r.get(0)).unwrap();
        assert_eq!(count, 2);
    }
}
