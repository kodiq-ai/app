# Architecture — Kodiq App

## Frontend (React 19)

Feature-based structure with 8 domain modules in `src/features/`:

| Feature | Store Slice | Key State |
|---------|------------|-----------|
| terminal | TerminalSlice | tabs[], activeTab, exitedTabs, closedTabs |
| editor | EditorSlice | editorTabs[], activeEditorTab, multi-tab + dirty tracking |
| project | ProjectSlice | projectPath, projectName, recentProjects[], launchConfigs[] |
| explorer | ExplorerSlice | fileTree[], sidebarOpen, sidebarTab |
| git | GitSlice | gitInfo, projectStats, commitMessage |
| preview | PreviewSlice | previewUrl, previewOpen, viewport |
| settings | SettingsSlice | settings, splitRatio, editorSplitRatio, update state |
| activity | ActivitySlice | activityLog[], sessionStartFiles[] |

Store: `useAppStore((s) => s.value)` — all 8 slices auto-merged in `src/store/index.ts`.

## Backend (Rust / Tauri 2)

Modular structure in `src-tauri/src/`:

| Module | Purpose |
|--------|---------|
| terminal/ | PTY spawn, write, resize, close + port detection parser |
| filesystem/ | read_dir, read_file, write_file + start/stop_watching |
| git/ | get_git_info, get_project_stats + stage/unstage/commit/diff |
| cli/ | detect_cli_tools (claude, gemini, codex, aider, ollama) |
| db/ | SQLite: projects, sessions, settings, history, snippets, launch_configs |

## Layout (App.tsx)

VS Code style vertical split:
- **Top**: EditorPanel (CodeMirror 6) — only renders when editorTabs > 0
- **Middle**: resizable drag handle (useVerticalSplit)
- **Bottom**: Terminal TabBar + XtermPanel
- **Right**: Sidebar (file tree / git / activity) + Preview panel

## Database

SQLite at `~/.config/kodiq/kodiq.db`. Auto-migrated via versioned migrations in `db/migrations.rs`.

Tables: `_migrations`, `projects`, `terminal_sessions`, `settings`, `command_history`, `snippets`, `launch_configs`.

## Events

- `pty-output { id, data }` — terminal output stream
- `pty-exit { id }` — process finished
- `port-detected { id, port, url }` — localhost port found
- `git-changed` — filesystem watcher triggers git refresh
- `fs-event { paths, kind }` — file system change notifications
