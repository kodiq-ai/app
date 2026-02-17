use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use crate::error::KodiqError;
use crate::state::DbState;

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchConfig {
    pub id: String,
    pub cli_name: String,
    pub profile_name: String,
    pub config: String,
    pub is_default: bool,
    pub project_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct NewLaunchConfig {
    pub cli_name: String,
    pub profile_name: String,
    pub config: String,
    pub is_default: Option<bool>,
    pub project_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateLaunchConfig {
    pub profile_name: Option<String>,
    pub config: Option<String>,
    pub is_default: Option<bool>,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn now() -> i64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/// List launch configs: global (project_id IS NULL) + project-specific.
pub fn list(
    conn: &Connection,
    project_id: Option<&str>,
) -> Result<Vec<LaunchConfig>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, cli_name, profile_name, config, is_default, project_id, created_at, updated_at
         FROM cli_profiles
         WHERE project_id IS NULL OR project_id = ?1
         ORDER BY is_default DESC, profile_name ASC",
    )?;

    let rows = stmt.query_map(rusqlite::params![project_id], |row| {
        Ok(LaunchConfig {
            id: row.get(0)?,
            cli_name: row.get(1)?,
            profile_name: row.get(2)?,
            config: row.get(3)?,
            is_default: row.get::<_, i32>(4)? != 0,
            project_id: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;

    rows.collect()
}

pub fn create(conn: &Connection, cfg: NewLaunchConfig) -> Result<LaunchConfig, rusqlite::Error> {
    let id = uuid::Uuid::new_v4().to_string();
    let ts = now();
    let is_default = cfg.is_default.unwrap_or(false) as i32;

    conn.execute(
        "INSERT INTO cli_profiles (id, cli_name, profile_name, config, is_default, project_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, cfg.cli_name, cfg.profile_name, cfg.config, is_default, cfg.project_id, ts, ts],
    )?;

    Ok(LaunchConfig {
        id,
        cli_name: cfg.cli_name,
        profile_name: cfg.profile_name,
        config: cfg.config,
        is_default: is_default != 0,
        project_id: cfg.project_id,
        created_at: ts,
        updated_at: ts,
    })
}

pub fn update(
    conn: &Connection,
    id: &str,
    patch: UpdateLaunchConfig,
) -> Result<(), rusqlite::Error> {
    let ts = now();
    let mut sets = vec!["updated_at = ?1".to_string()];
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(ts)];
    let mut idx = 2;

    if let Some(ref name) = patch.profile_name {
        sets.push(format!("profile_name = ?{idx}"));
        params.push(Box::new(name.clone()));
        idx += 1;
    }
    if let Some(ref config) = patch.config {
        sets.push(format!("config = ?{idx}"));
        params.push(Box::new(config.clone()));
        idx += 1;
    }
    if let Some(is_default) = patch.is_default {
        sets.push(format!("is_default = ?{idx}"));
        params.push(Box::new(is_default as i32));
        idx += 1;
    }
    let _ = idx;

    let sql =
        format!("UPDATE cli_profiles SET {} WHERE id = ?{}", sets.join(", "), params.len() + 1);
    params.push(Box::new(id.to_string()));

    conn.execute(&sql, rusqlite::params_from_iter(params.iter().map(|p| p.as_ref())))?;

    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), rusqlite::Error> {
    conn.execute("DELETE FROM cli_profiles WHERE id = ?1", rusqlite::params![id])?;
    Ok(())
}

// ── Tauri Commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn db_list_launch_configs(
    project_id: Option<String>,
    db: tauri::State<'_, DbState>,
) -> Result<Vec<LaunchConfig>, KodiqError> {
    let conn = db.connection.lock()?;
    Ok(list(&conn, project_id.as_deref())?)
}

#[tauri::command]
pub fn db_create_launch_config(
    config: NewLaunchConfig,
    db: tauri::State<'_, DbState>,
) -> Result<LaunchConfig, KodiqError> {
    let conn = db.connection.lock()?;
    Ok(create(&conn, config)?)
}

#[tauri::command]
pub fn db_update_launch_config(
    id: String,
    patch: UpdateLaunchConfig,
    db: tauri::State<'_, DbState>,
) -> Result<(), KodiqError> {
    let conn = db.connection.lock()?;
    Ok(update(&conn, &id, patch)?)
}

#[tauri::command]
pub fn db_delete_launch_config(
    id: String,
    db: tauri::State<'_, DbState>,
) -> Result<(), KodiqError> {
    let conn = db.connection.lock()?;
    Ok(delete(&conn, &id)?)
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::init_test;

    #[test]
    fn test_create_and_list() {
        let db = init_test();
        let conn = db.connection.lock().unwrap();

        // Need a project first
        crate::db::projects::create(&conn, "test", "/tmp/test").unwrap();
        let projects = crate::db::projects::list(&conn).unwrap();
        let pid = &projects[0].id;

        let cfg = create(
            &conn,
            NewLaunchConfig {
                cli_name: "claude".into(),
                profile_name: "default".into(),
                config: r#"{"args":["--no-logs"]}"#.into(),
                is_default: Some(true),
                project_id: Some(pid.clone()),
            },
        )
        .unwrap();

        assert_eq!(cfg.cli_name, "claude");
        assert!(cfg.is_default);

        let all = list(&conn, Some(pid)).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].profile_name, "default");
    }

    #[test]
    fn test_global_config() {
        let db = init_test();
        let conn = db.connection.lock().unwrap();

        create(
            &conn,
            NewLaunchConfig {
                cli_name: "claude".into(),
                profile_name: "global-default".into(),
                config: r#"{"args":[]}"#.into(),
                is_default: None,
                project_id: None,
            },
        )
        .unwrap();

        // Global configs show up when listing for any project_id
        let all = list(&conn, Some("any-project-id")).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].profile_name, "global-default");
    }

    #[test]
    fn test_update_and_delete() {
        let db = init_test();
        let conn = db.connection.lock().unwrap();

        let cfg = create(
            &conn,
            NewLaunchConfig {
                cli_name: "aider".into(),
                profile_name: "sonnet".into(),
                config: r#"{"args":["--model","sonnet"]}"#.into(),
                is_default: None,
                project_id: None,
            },
        )
        .unwrap();

        update(
            &conn,
            &cfg.id,
            UpdateLaunchConfig {
                profile_name: Some("sonnet-4".into()),
                config: None,
                is_default: Some(true),
            },
        )
        .unwrap();

        let all = list(&conn, None).unwrap();
        assert_eq!(all[0].profile_name, "sonnet-4");
        assert!(all[0].is_default);

        delete(&conn, &cfg.id).unwrap();
        let all = list(&conn, None).unwrap();
        assert!(all.is_empty());
    }
}
