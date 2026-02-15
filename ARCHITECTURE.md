# Kodiq — Architecture

Technical architecture document. For roadmap see [ROADMAP.md](./ROADMAP.md), for product vision see [VISION.md](./VISION.md).

---

## Architectural Principles

1. **Core is 100% offline** — no network calls in the open source build
2. **Pro is a plugin, not a fork** — Pro code in `src/pro/`, conditionally compiled via `__PRO__` flag
3. **Modules over monolith** — each domain is an independent module in both Rust and React
4. **Feature flags over branches** — `edition: "community" | "pro"`, not separate codebases
5. **English first** — default locale is English, translations are separate JSON files
6. **SQLite is the source of truth** — no localStorage for persistent data, all state in DB
7. **Typed boundaries** — every Rust↔JS bridge call is typed on both sides via `shared/lib/tauri.ts`
8. **Contributors work in isolation** — touching `git/info.rs` doesn't require understanding `terminal/manager.rs`

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Desktop | Tauri 2.10, Rust | 3-10 MB binary, 20-50 MB RAM, native performance |
| Rust backend | Modular Rust | PTY, FS, git, CLI, DB — each its own module |
| Frontend | React 19, TypeScript 5.9 | Largest ecosystem, best for IDE-scale apps |
| UI | Tailwind CSS v4, shadcn/ui (new-york) | Dark-only design system with CSS tokens |
| State | Zustand 5 (7 domain slices) | Single store, domain slices, minimal boilerplate |
| Terminal | xterm.js 6 + WebGL + portable-pty | Industry standard (VS Code, Cursor use same) |
| Syntax | Shiki 3 (read-only viewer) | Future: CodeMirror 6 for editing |
| Database | SQLite via rusqlite (bundled) | Local-first, migrations, future Supabase sync |
| i18n | JSON locale files | English default, Russian lazy-loaded |
| Build | Vite 7 | Fastest bundler, native Tailwind v4 plugin |
| CI/CD | GitHub Actions | Cross-platform builds, auto-update via tauri-plugin-updater |
| License | Apache 2.0 | Permissive, enterprise-friendly |

---

## Data Layer — Three-Tier Storage

### Tier 1 — tauri-plugin-store (key-value)

App-level config that rarely changes and may be sensitive: license key (Pro), API tokens, app edition, first-launch flag.

Stored at `~/.config/kodiq/config.json`.

### Tier 2 — SQLite (primary database)

Everything else: projects, sessions, settings, command history, snippets.

Stored at `~/.config/kodiq/kodiq.db`. Bundled SQLite engine — users install nothing.

Tables: `_migrations`, `projects`, `terminal_sessions`, `settings`, `command_history`, `snippets`.

Future tables (designed but not yet implemented): `cli_profiles`, `ai_conversations`, `ai_messages`, `git_cache`.

Migration system in `db/migrations.rs` — versioned SQL applied sequentially on startup. Add new migrations by incrementing version number.

### Tier 3 — Filesystem

Logs, temp files, preview cache. Non-critical, OK to lose. Stored at `~/.config/kodiq/logs/`.

### Zustand ↔ SQLite Pattern

Settings and project state load from SQLite on app start, then Zustand holds the in-memory copy for fast React renders. Writes go to both Zustand and SQLite.

---

## Rust Backend — Module Structure

```
src-tauri/src/
├── main.rs                 # Entry point
├── lib.rs                  # Module registration + Tauri setup (~70 lines)
├── state.rs                # AppState (terminal map), DbState (SQLite connection)
│
├── terminal/
│   ├── mod.rs              # Re-exports
│   ├── manager.rs          # spawn_terminal, write_to_pty, resize_pty, close_terminal
│   └── parser.rs           # Port detection regex, ANSI stripping
│
├── filesystem/
│   ├── mod.rs
│   └── read.rs             # read_dir (skips node_modules/.git/target), read_file (max 1MB)
│
├── git/
│   ├── mod.rs
│   └── info.rs             # get_git_info (branch, changes, ahead/behind), get_project_stats
│
├── cli/
│   ├── mod.rs
│   └── detect.rs           # detect_cli_tools (claude, gemini, codex, aider, ollama)
│
└── db/
    ├── mod.rs              # Database init, connection pool
    ├── migrations.rs       # Schema versioning (auto-migration on startup)
    ├── projects.rs         # db_list/create/touch/update_project
    ├── sessions.rs         # db_list/save/close_session
    ├── settings.rs         # db_get/set_setting, db_get_all_settings
    ├── history.rs          # db_search/add_history
    └── snippets.rs         # db_list/create/use_snippet
```

### Future modules (planned, not implemented)

```
├── terminal/
│   ├── resolver.rs         # Command resolution (shell/claude/gemini)
│   └── parsers/            # Per-CLI output parsers (CliParser trait)
│       ├── mod.rs
│       ├── claude.rs
│       └── gemini.rs
├── filesystem/
│   ├── watch.rs            # File watcher (notify crate)
│   └── search.rs           # Fuzzy file search
├── git/
│   ├── operations.rs       # Stage, commit, push, pull
│   └── github.rs           # GitHub API via gh CLI
├── cli/
│   ├── install.rs          # Auto-install helpers
│   └── profiles.rs         # CLI profiles from DB
└── pro/                    # #[cfg(feature = "pro")]
    ├── auth.rs             # Supabase auth
    └── sync.rs             # SQLite ↔ Supabase sync
```

### Tauri Events

| Event | Payload | Emitted by |
|-------|---------|-----------|
| `pty-output` | `{ id, data }` | terminal/manager.rs |
| `pty-exit` | `{ id }` | terminal/manager.rs |
| `port-detected` | `{ id, port, url }` | terminal/parser.rs |

---

## Frontend — Module Structure

```
src/
├── features/                  # Domain modules
│   ├── terminal/              # PTY tabs, xterm rendering
│   │   ├── store/terminalSlice.ts
│   │   └── index.ts
│   ├── project/               # Project lifecycle, recent projects
│   │   ├── store/projectSlice.ts
│   │   └── index.ts
│   ├── editor/                # File viewer (Shiki highlighting)
│   │   ├── store/editorSlice.ts
│   │   └── index.ts
│   ├── preview/               # iframe live preview
│   │   ├── store/previewSlice.ts
│   │   └── index.ts
│   ├── explorer/              # File tree sidebar
│   │   ├── store/explorerSlice.ts
│   │   └── index.ts
│   ├── settings/              # App settings + auto-update state
│   │   ├── store/settingsSlice.ts
│   │   └── index.ts
│   └── git/                   # Git info, project stats
│       ├── store/gitSlice.ts
│       └── index.ts
│
├── shared/                    # Cross-feature utilities
│   ├── lib/
│   │   ├── types.ts           # All shared TypeScript types
│   │   ├── tauri.ts           # Typed Tauri bridge (all invoke calls)
│   │   ├── errors.ts          # handleError(), trySafe()
│   │   ├── constants.ts       # CLI_COLORS, XTERM_THEME
│   │   └── utils.ts           # cn() utility
│   └── i18n/
│       ├── index.ts           # t(), setLocale(), getLocale()
│       ├── en.json            # English (default, bundled)
│       └── ru.json            # Russian (lazy-loaded)
│
├── store/
│   └── index.ts               # Combined Zustand store (7 slices)
│
├── components/                # App components + components/ui/ (shadcn)
├── hooks/                     # useHighlighter, useKeyboardShortcuts, useSplitDrag
├── lib/                       # Compatibility shims → re-export from new locations
├── pro/                       # Pro edition stub (__PRO__ flag)
├── test/setup.ts              # Vitest setup + Tauri mocks
│
├── App.tsx                    # Root layout + project lifecycle
├── main.tsx                   # React root + providers
├── app.css                    # Design tokens + xterm styles + animations
└── env.d.ts                   # __PRO__ type declaration
```

### Zustand Store — 7 Slices

| Slice | File | Key State |
|-------|------|-----------|
| TerminalSlice | features/terminal/store | tabs, activeTab, exitedTabs, notifiedTabs |
| ProjectSlice | features/project/store | projectPath, projectName, recentProjects, cliTools |
| EditorSlice | features/editor/store | openFilePath, openFileContent |
| PreviewSlice | features/preview/store | previewUrl, previewOpen, viewport |
| ExplorerSlice | features/explorer/store | fileTree, sidebarOpen, sidebarTab |
| SettingsSlice | features/settings/store | settings, splitRatio, UI toggles, update state |
| GitSlice | features/git/store | gitInfo, projectStats |

All slices merged in `store/index.ts`. Usage: `useAppStore((s) => s.value)`.

### Typed Tauri Bridge

All Rust↔JS calls go through `shared/lib/tauri.ts`. No raw `invoke()` elsewhere.

Namespaces: `terminal.*`, `fs.*`, `git.*`, `cli.*`, `db.projects.*`, `db.settings.*`, `db.sessions.*`, `db.history.*`, `db.snippets.*`.

### Path Aliases

| Alias | Points to |
|-------|-----------|
| `@` | `src/` |
| `@features` | `src/features/` |
| `@shared` | `src/shared/` |

---

## CLI Output Intelligence Architecture

Kodiq's core differentiator. Parse AI CLI output and add interactive value.

### Layers

1. **Port Detection** (implemented) — regex in `terminal/parser.rs` detects localhost URLs
2. **Output Parsing** (planned) — `CliParser` trait with per-CLI implementations
3. **Action Buttons** (planned) — "Apply diff", "Run command", "Reject" — CSS overlay on xterm

### ParsedBlock Types (planned)

CodeBlock, Diff, Markdown, Error, Progress, Action — each with its own renderer.

### Design Principle

Parsing happens in Rust (fast, no UI thread blocking). Parsed blocks are sent to frontend as structured events. Frontend renders overlays on top of xterm canvas.

---

## Pro Integration Architecture

Build-time separation via Vite `define` and Cargo `features`:

- Frontend: `__PRO__` constant, dead code eliminated in community builds
- Rust: `#[cfg(feature = "pro")]` — `cargo build` = community, `cargo build --features pro` = Pro
- Future Supabase sync: local SQLite ↔ Supabase PostgreSQL, last-write-wins conflict resolution

---

## Auto-Update System

Uses `tauri-plugin-updater` + GitHub Releases.

Flow: App start → check GitHub Releases → if update found → toast notification → user clicks "Update" → download with progress → install → relaunch.

Three UI layers: toast (one-time), persistent badge (title bar), update dialog (full changelog + progress).

Version synced across: `Cargo.toml`, `tauri.conf.json`, `package.json`.

Signing: keypair via `npx @tauri-apps/cli signer generate`, private key in GitHub secrets.

---

## CI/CD

### ci.yml (PR/push)

Jobs: lint-frontend → lint-rust → test-frontend → test-rust → build (matrix: macOS arm64/x64, Ubuntu 22.04, Windows).

### release.yml (tag push)

Triggered on `v*` tags. Builds signed binaries for all platforms. Creates draft GitHub Release with `latest.json` for auto-update.

Required secrets: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | AI assistant instructions — conventions, commands, patterns |
| [ROADMAP.md](./ROADMAP.md) | Product roadmap (Now / Next / Later) |
| [COMPETITIVE-BRIEF.md](./COMPETITIVE-BRIEF.md) | Competitive analysis — Warp, Wave, Ghostty, Tabby |
| [VISION.md](./VISION.md) | Long-term product vision — community, deploy, mobile |

---

*Last updated: 2026-02-15 (v5 — restructured: roadmap moved to ROADMAP.md, removed code samples)*
