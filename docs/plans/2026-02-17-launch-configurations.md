# Launch Configurations — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add saved launch configurations so users can one-click launch CLI tools with preset arguments, env vars, and cwd per project or globally.

**Architecture:** Reuse existing `cli_profiles` table (add `project_id` column via migration 002). New Rust CRUD module + Tauri commands. Frontend: extend ProjectSlice, extend QuickLaunch, add LaunchConfigDialog. Keyboard shortcut `Cmd+Shift+L` re-runs last config.

**Tech Stack:** Rust/SQLite (backend), Zustand (state), React + shadcn/ui (UI), Tauri bridge (IPC)

---

### Task 1: Database Migration — Add `project_id` to `cli_profiles`

**Files:**
- Create: `src-tauri/migrations/002_launch_configs.sql`
- Modify: `src-tauri/src/db/migrations.rs`

**Step 1: Create migration SQL**

Create `src-tauri/migrations/002_launch_configs.sql`:
```sql
-- Add project_id to cli_profiles for per-project launch configs
ALTER TABLE cli_profiles ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE CASCADE;

-- Drop old unique index and create new one that includes project_id
DROP INDEX IF EXISTS idx_cli_profiles_unique;
CREATE UNIQUE INDEX idx_cli_profiles_unique ON cli_profiles(cli_name, profile_name, COALESCE(project_id, '__global__'));
```

**Step 2: Register migration**

In `src-tauri/src/db/migrations.rs`, add to `MIGRATIONS` array:
```rust
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
```

**Step 3: Run cargo test to verify migration applies**

Run: `cd /Users/artemboev/Projects/kodiq/app && cargo test -p kodiq-app -- migrations`
Expected: All migration tests pass (existing + new schema)

**Step 4: Commit**
```bash
git add src-tauri/migrations/002_launch_configs.sql src-tauri/src/db/migrations.rs
git commit -m "feat(db): add project_id to cli_profiles via migration 002"
```

---

### Task 2: Rust Backend — Launch Configs CRUD Module

**Files:**
- Create: `src-tauri/src/db/launch_configs.rs`
- Modify: `src-tauri/src/db/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Write tests first**

Create `src-tauri/src/db/launch_configs.rs` with test module:
```rust
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchConfig {
    pub id: String,
    pub cli_name: String,
    pub profile_name: String,
    pub config: String, // JSON: { args, env, cwd, shell }
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

fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

pub fn list(conn: &Connection, project_id: Option<&str>) -> Result<Vec<LaunchConfig>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, cli_name, profile_name, config, is_default, project_id, created_at, updated_at
             FROM cli_profiles
             WHERE project_id IS NULL OR project_id = ?1
             ORDER BY is_default DESC, profile_name ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params![project_id], |row| {
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
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn create(conn: &Connection, cfg: NewLaunchConfig) -> Result<LaunchConfig, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let ts = now();
    let is_default = cfg.is_default.unwrap_or(false) as i32;

    conn.execute(
        "INSERT INTO cli_profiles (id, cli_name, profile_name, config, is_default, project_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, cfg.cli_name, cfg.profile_name, cfg.config, is_default, cfg.project_id, ts, ts],
    )
    .map_err(|e| e.to_string())?;

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

pub fn update(conn: &Connection, id: &str, patch: UpdateLaunchConfig) -> Result<(), String> {
    let ts = now();
    let mut sets = vec!["updated_at = ?1".to_string()];
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(ts)];
    let mut idx = 2;

    if let Some(ref name) = patch.profile_name {
        sets.push(format!("profile_name = ?{}", idx));
        params.push(Box::new(name.clone()));
        idx += 1;
    }
    if let Some(ref config) = patch.config {
        sets.push(format!("config = ?{}", idx));
        params.push(Box::new(config.clone()));
        idx += 1;
    }
    if let Some(is_default) = patch.is_default {
        sets.push(format!("is_default = ?{}", idx));
        params.push(Box::new(is_default as i32));
        idx += 1;
    }
    let _ = idx;

    let sql = format!("UPDATE cli_profiles SET {} WHERE id = ?{}", sets.join(", "), params.len() + 1);
    params.push(Box::new(id.to_string()));

    conn.execute(&sql, rusqlite::params_from_iter(params.iter().map(|p| p.as_ref())))
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM cli_profiles WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Tauri Commands ─────────────────────────────────────────────

use crate::state::DbState;

#[tauri::command]
pub fn db_list_launch_configs(
    project_id: Option<String>,
    db: tauri::State<'_, DbState>,
) -> Result<Vec<LaunchConfig>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    list(&conn, project_id.as_deref())
}

#[tauri::command]
pub fn db_create_launch_config(
    config: NewLaunchConfig,
    db: tauri::State<'_, DbState>,
) -> Result<LaunchConfig, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    create(&conn, config)
}

#[tauri::command]
pub fn db_update_launch_config(
    id: String,
    patch: UpdateLaunchConfig,
    db: tauri::State<'_, DbState>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    update(&conn, &id, patch)
}

#[tauri::command]
pub fn db_delete_launch_config(
    id: String,
    db: tauri::State<'_, DbState>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    delete(&conn, &id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::init_test;

    #[test]
    fn test_create_and_list() {
        let db = init_test();
        let conn = db.conn.lock().unwrap();

        // Need a project first
        crate::db::projects::create(&conn, "test", "/tmp/test").unwrap();
        let projects = crate::db::projects::list(&conn).unwrap();
        let pid = &projects[0].id;

        let cfg = create(&conn, NewLaunchConfig {
            cli_name: "claude".into(),
            profile_name: "default".into(),
            config: r#"{"args":["--no-logs"]}"#.into(),
            is_default: Some(true),
            project_id: Some(pid.clone()),
        }).unwrap();

        assert_eq!(cfg.cli_name, "claude");
        assert!(cfg.is_default);

        let all = list(&conn, Some(pid)).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].profile_name, "default");
    }

    #[test]
    fn test_global_config() {
        let db = init_test();
        let conn = db.conn.lock().unwrap();

        create(&conn, NewLaunchConfig {
            cli_name: "claude".into(),
            profile_name: "global-default".into(),
            config: r#"{"args":[]}"#.into(),
            is_default: None,
            project_id: None,
        }).unwrap();

        // Global configs show up when listing for any project
        let all = list(&conn, Some("any-project-id")).unwrap();
        assert_eq!(all.len(), 1);
    }

    #[test]
    fn test_update_and_delete() {
        let db = init_test();
        let conn = db.conn.lock().unwrap();

        let cfg = create(&conn, NewLaunchConfig {
            cli_name: "aider".into(),
            profile_name: "sonnet".into(),
            config: r#"{"args":["--model","sonnet"]}"#.into(),
            is_default: None,
            project_id: None,
        }).unwrap();

        update(&conn, &cfg.id, UpdateLaunchConfig {
            profile_name: Some("sonnet-4".into()),
            config: None,
            is_default: Some(true),
        }).unwrap();

        let all = list(&conn, None).unwrap();
        assert_eq!(all[0].profile_name, "sonnet-4");
        assert!(all[0].is_default);

        delete(&conn, &cfg.id).unwrap();
        let all = list(&conn, None).unwrap();
        assert!(all.is_empty());
    }
}
```

**Step 2: Register module in db/mod.rs**

Add `pub mod launch_configs;` to `src-tauri/src/db/mod.rs`.

**Step 3: Register Tauri commands in lib.rs**

Add to `invoke_handler`:
```rust
// Database — Launch Configs
db::launch_configs::db_list_launch_configs,
db::launch_configs::db_create_launch_config,
db::launch_configs::db_update_launch_config,
db::launch_configs::db_delete_launch_config,
```

**Step 4: Run tests**

Run: `cd /Users/artemboev/Projects/kodiq/app && cargo test -p kodiq-app`
Expected: All tests pass including new launch_configs tests.

**Step 5: Commit**
```bash
git add src-tauri/src/db/launch_configs.rs src-tauri/src/db/mod.rs src-tauri/src/lib.rs
git commit -m "feat(backend): add launch configs CRUD module with Tauri commands"
```

---

### Task 3: Frontend Types + Tauri Bridge

**Files:**
- Modify: `src/shared/lib/types.ts`
- Modify: `src/shared/lib/tauri.ts`

**Step 1: Add TypeScript types**

Add to `src/shared/lib/types.ts`:
```typescript
// ── Launch Configs ──────────────────────────────────────────
export interface LaunchConfig {
  id: string;
  cli_name: string;
  profile_name: string;
  config: string; // JSON: { args, env, cwd, shell }
  is_default: boolean;
  project_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface LaunchConfigPayload {
  args: string[];
  env: Record<string, string>;
  cwd: string | null;
  shell: string | null;
}

export interface NewLaunchConfig {
  cli_name: string;
  profile_name: string;
  config: string;
  is_default?: boolean;
  project_id?: string | null;
}

export interface UpdateLaunchConfig {
  profile_name?: string;
  config?: string;
  is_default?: boolean;
}
```

**Step 2: Add bridge methods**

Add to `src/shared/lib/tauri.ts` inside `db` object:
```typescript
  // ── Database — Launch Configs ─────────────────────────────
  launchConfigs: {
    list: (projectId?: string | null) =>
      invoke<LaunchConfig[]>("db_list_launch_configs", { projectId: projectId ?? null }),
    create: (config: NewLaunchConfig) =>
      invoke<LaunchConfig>("db_create_launch_config", { config }),
    update: (id: string, patch: UpdateLaunchConfig) =>
      invoke<void>("db_update_launch_config", { id, patch }),
    delete: (id: string) => invoke<void>("db_delete_launch_config", { id }),
  },
```

**Step 3: Commit**
```bash
git add src/shared/lib/types.ts src/shared/lib/tauri.ts
git commit -m "feat(frontend): add LaunchConfig types and Tauri bridge methods"
```

---

### Task 4: Zustand Store — ProjectSlice Extension

**Files:**
- Modify: `src/features/project/store/projectSlice.ts`

**Step 1: Extend ProjectSlice interface**

Add to `ProjectSlice` interface:
```typescript
launchConfigs: LaunchConfig[];
lastLaunchConfigId: string | null;
setLaunchConfigs: (configs: LaunchConfig[]) => void;
addLaunchConfig: (config: LaunchConfig) => void;
removeLaunchConfig: (id: string) => void;
updateLaunchConfig: (id: string, patch: UpdateLaunchConfig) => void;
setLastLaunchConfigId: (id: string | null) => void;
loadLaunchConfigs: (projectId?: string | null) => Promise<void>;
```

**Step 2: Add initial state and actions**

```typescript
launchConfigs: [],
lastLaunchConfigId: null,

setLaunchConfigs: (launchConfigs) => set({ launchConfigs }),

addLaunchConfig: (config) =>
  set((s) => ({ launchConfigs: [...s.launchConfigs, config] })),

removeLaunchConfig: (id) =>
  set((s) => ({
    launchConfigs: s.launchConfigs.filter((c) => c.id !== id),
    lastLaunchConfigId: s.lastLaunchConfigId === id ? null : s.lastLaunchConfigId,
  })),

updateLaunchConfig: (id, patch) =>
  set((s) => ({
    launchConfigs: s.launchConfigs.map((c) =>
      c.id === id ? { ...c, ...patch, updated_at: Date.now() / 1000 } : c
    ),
  })),

setLastLaunchConfigId: (lastLaunchConfigId) => {
  set({ lastLaunchConfigId });
  db.settings
    .set("lastLaunchConfigId", lastLaunchConfigId || "")
    .catch((e) => console.error("[DB] lastLaunchConfigId:", e));
},

loadLaunchConfigs: async (projectId) => {
  try {
    const configs = await db.launchConfigs.list(projectId);
    set({ launchConfigs: configs });
  } catch (e) {
    console.error("[DB] loadLaunchConfigs:", e);
  }
},
```

**Step 3: Commit**
```bash
git add src/features/project/store/projectSlice.ts
git commit -m "feat(store): extend ProjectSlice with launch configs state and actions"
```

---

### Task 5: i18n Keys

**Files:**
- Modify: `src/shared/i18n/en.json`
- Modify: `src/shared/i18n/ru.json`

**Step 1: Add English keys**
```json
"launchConfigs": "Launch Configs",
"newLaunchConfig": "New config",
"editLaunchConfig": "Edit config",
"deleteLaunchConfig": "Delete config",
"launchConfigName": "Name",
"launchConfigCli": "CLI tool",
"launchConfigArgs": "Arguments",
"launchConfigEnv": "Environment variables",
"launchConfigCwd": "Working directory",
"launchConfigDefault": "Default",
"launchConfigGlobal": "Global",
"launchConfigProject": "Project only",
"launchConfigCreated": "Config created",
"launchConfigDeleted": "Config deleted",
"launchConfigSave": "Save",
"launchConfigCancel": "Cancel",
"relaunchLast": "Relaunch last config",
"noLaunchConfigs": "No saved configs"
```

**Step 2: Add Russian keys**
```json
"launchConfigs": "Конфигурации",
"newLaunchConfig": "Новая конфигурация",
"editLaunchConfig": "Редактировать",
"deleteLaunchConfig": "Удалить конфигурацию",
"launchConfigName": "Название",
"launchConfigCli": "CLI инструмент",
"launchConfigArgs": "Аргументы",
"launchConfigEnv": "Переменные окружения",
"launchConfigCwd": "Рабочая директория",
"launchConfigDefault": "По умолчанию",
"launchConfigGlobal": "Глобальная",
"launchConfigProject": "Только для проекта",
"launchConfigCreated": "Конфигурация создана",
"launchConfigDeleted": "Конфигурация удалена",
"launchConfigSave": "Сохранить",
"launchConfigCancel": "Отмена",
"relaunchLast": "Повторить последний запуск",
"noLaunchConfigs": "Нет сохранённых конфигураций"
```

**Step 3: Commit**
```bash
git add src/shared/i18n/en.json src/shared/i18n/ru.json
git commit -m "feat(i18n): add launch config translation keys (en + ru)"
```

---

### Task 6: LaunchConfigDialog Component

**Files:**
- Create: `src/features/terminal/components/LaunchConfigDialog.tsx`

**Step 1: Build the dialog component**

A shadcn Dialog with form fields: name, CLI select, arguments textarea, env key-value pairs, cwd input, global/project toggle. Uses `db.launchConfigs.create()` / `db.launchConfigs.update()` on save. Calls `addLaunchConfig()` / `updateLaunchConfig()` on store.

Key considerations:
- CLI select populated from `cliTools` (installed only)
- Arguments as space-separated string, parsed to array on save
- Env vars as key=value textarea (one per line)
- "Default" checkbox
- "Global" vs "Project only" radio

**Step 2: Commit**
```bash
git add src/features/terminal/components/LaunchConfigDialog.tsx
git commit -m "feat(ui): add LaunchConfigDialog component"
```

---

### Task 7: Extend QuickLaunch with Launch Configs

**Files:**
- Modify: `src/features/terminal/components/QuickLaunch.tsx`

**Step 1: Load and display launch configs**

- Import `LaunchConfig` type, `db.launchConfigs`, store actions
- On mount (+ projectId change), call `loadLaunchConfigs(projectId)`
- Group configs by `cli_name`, show under each CLI tool
- Add "+" button to open LaunchConfigDialog
- Context menu on configs: Edit, Delete, Set as default
- On click: parse config JSON, build full command with args, call `onSpawnTab(fullCommand, profileName)` and `setLastLaunchConfigId(id)`

**Step 2: Commit**
```bash
git add src/features/terminal/components/QuickLaunch.tsx
git commit -m "feat(ui): show launch configs in QuickLaunch with create/edit/delete"
```

---

### Task 8: Extend Terminal Spawn to Support Env Vars

**Files:**
- Modify: `src-tauri/src/terminal/manager.rs`
- Modify: `src/shared/lib/tauri.ts`

**Step 1: Add `env` parameter to `spawn_terminal`**

Update Rust `spawn_terminal` to accept `env: Option<HashMap<String, String>>`. Apply custom env vars to CommandBuilder before spawning.

Update TypeScript bridge `terminal.spawn` to accept optional `env` parameter.

**Step 2: Commit**
```bash
git add src-tauri/src/terminal/manager.rs src/shared/lib/tauri.ts
git commit -m "feat(terminal): support custom env vars in spawn_terminal"
```

---

### Task 9: Cmd+Shift+L — Relaunch Last Config

**Files:**
- Modify: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/App.tsx`

**Step 1: Add shortcut handler**

In `useKeyboardShortcuts`, add `Cmd+Shift+L` → `relaunchLast()`. The function reads `lastLaunchConfigId` from store, finds the config, parses it, and calls `spawnTab()` with the full command + env.

**Step 2: Load `lastLaunchConfigId` from DB on startup**

In `App.tsx` init, after loading settings, read `lastLaunchConfigId` from `db.settings.get()` and set it in store.

Also load launch configs after project opens (in `openProject()`).

**Step 3: Commit**
```bash
git add src/hooks/useKeyboardShortcuts.ts src/App.tsx
git commit -m "feat: add Cmd+Shift+L to relaunch last used config"
```

---

### Task 10: Auto-Generate Default Configs for Installed CLIs

**Files:**
- Modify: `src/App.tsx` (in `openProject` flow)

**Step 1: After project opens + CLI detection, check if configs exist**

If `launchConfigs` is empty for this project and globally, auto-create one default config per installed CLI with empty args. This gives users something to customize from.

**Step 2: Commit**
```bash
git add src/App.tsx
git commit -m "feat: auto-generate default launch configs for detected CLIs"
```

---

### Task 11: Integration Test + Manual Verification

**Step 1: Run full test suite**
```bash
cd /Users/artemboev/Projects/kodiq/app
cargo test -p kodiq-app
pnpm run test
pnpm run lint
```

**Step 2: Manual test with `pnpm run tauri:dev`**
- Open project → verify QuickLaunch shows CLI tools
- Click "+" → create a config with args
- Verify config appears in QuickLaunch
- Click config → terminal opens with correct command
- Cmd+Shift+L → re-launches last config
- Close and reopen project → configs persist

**Step 3: Final commit if any fixes needed**
```bash
git add -A
git commit -m "fix: polish launch configs integration"
```
