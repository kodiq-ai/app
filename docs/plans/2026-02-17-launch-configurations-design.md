# Launch Configurations — Design

> v0.4.0 feature. Saved CLI launch configs with one-click execution.

## Problem

Users repeatedly type the same CLI commands with flags (`claude --no-logs`, `aider --model sonnet`). No way to save and reuse these configurations per-project or globally.

## Solution

Saved launch configurations stored in SQLite. Users create configs once, launch with one click from QuickLaunch or sidebar. `Cmd+Shift+L` re-runs the last used config.

## Storage

Reuse existing `cli_profiles` table (created in v0.3.0 schema, currently unused). Add `project_id` column via migration 002:

- `project_id = NULL` → global config (available in all projects)
- `project_id = "uuid"` → project-specific config

**`config` JSON schema:**
```json
{
  "args": ["--no-logs", "--model", "sonnet"],
  "env": { "KEY": "value" },
  "cwd": "/override/path",
  "shell": "zsh"
}
```

## UI Changes

1. **QuickLaunch** — show saved configs under each CLI tool. "+" button opens create dialog.
2. **LaunchConfigDialog** — form: name, CLI, arguments, env vars, cwd override.
3. **Sidebar** — "Launch Configs" section in project panel for one-click launch.
4. **Cmd+Shift+L** — relaunch last used configuration.

## Backend

New module `src-tauri/src/db/launch_configs.rs`:
- `list(project_id?)` — returns global + project-specific configs
- `create(...)`, `update(...)`, `delete(id)`
- `set_default(id, cli_name, project_id)`

New Tauri commands registered in `lib.rs`.

## Frontend

- `LaunchConfig` type in `types.ts`
- Bridge methods in `tauri.ts`
- `ProjectSlice` extended: `launchConfigs[]`, `lastLaunchConfigId`
- `LaunchConfigDialog.tsx` component
- `QuickLaunch.tsx` extended with configs

## Auto-templates

On first project open, auto-generate default configs for detected installed CLIs (claude, gemini, aider, codex, ollama) with no extra arguments.

## Future (v0.5.0+)

- Export/import `.kodiq/launch.json` for sharing via git
- Global configs at `~/.config/kodiq/launches/`
