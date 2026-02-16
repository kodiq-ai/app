# Kodiq — AI Terminal IDE

Tauri 2 desktop app: Rust backend + React 19 frontend. Dark-only theme, English/Russian UI.

## Quick Start

```bash
pnpm run tauri:dev          # dev with terminal output
pnpm run dev:bg             # dev in background (no terminal)
pnpm run dev:logs           # tail dev logs
pnpm run dev:stop           # stop background dev
pnpm run tauri:build        # production .app

# Quality
pnpm run test               # Vitest (frontend)
pnpm run test:rust          # cargo test (backend)
pnpm run test:all           # both
pnpm run lint               # ESLint
pnpm run format:check       # Prettier check
pnpm run check:all          # lint + format + test (everything)
```

## Architecture

```
src/                           # React frontend (feature-based)
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
├── store/
│   └── index.ts               # Combined Zustand store (7 slices)
├── components/                # App components + components/ui/ (shadcn)
├── hooks/                     # useHighlighter, useKeyboardShortcuts, useSplitDrag
├── lib/                       # Compatibility shims (re-export from new locations)
├── pro/                       # Pro edition stub (__PRO__ flag)
├── test/
│   └── setup.ts               # Vitest setup + Tauri mocks
├── App.tsx                    # Root layout + project lifecycle
├── main.tsx                   # React root + providers
├── app.css                    # Design tokens + xterm styles + animations
└── env.d.ts                   # __PRO__ type declaration

src-tauri/                     # Rust backend (modular)
├── src/
│   ├── lib.rs                 # Tauri app setup + plugin registration
│   ├── main.rs                # Entry point
│   ├── state.rs               # Shared AppState (terminal map)
│   ├── terminal/
│   │   ├── mod.rs             # Module exports
│   │   ├── manager.rs         # spawn_terminal, write_to_pty, resize_pty, close_terminal
│   │   └── parser.rs          # Port detection parser
│   ├── filesystem/
│   │   ├── mod.rs             # Module exports
│   │   └── read.rs            # read_dir, read_file
│   ├── git/
│   │   ├── mod.rs             # Module exports
│   │   └── info.rs            # get_git_info, get_project_stats
│   ├── cli/
│   │   ├── mod.rs             # Module exports
│   │   └── detect.rs          # detect_cli_tools
│   └── db/
│       ├── mod.rs             # Database init + connection pool
│       ├── migrations.rs      # Schema versioning (auto-migration on startup)
│       ├── projects.rs        # db_list/create/touch/update_project
│       ├── sessions.rs        # db_list/save/close_session
│       ├── settings.rs        # db_get/set_setting, db_get_all_settings
│       ├── history.rs         # db_search/add_history
│       └── snippets.rs        # db_list/create/use_snippet
├── capabilities/              # Tauri permissions (default.json)
└── tauri.conf.json            # Window config, CSP, bundle

.github/workflows/
├── ci.yml                     # lint → test → build (matrix: macOS/Linux/Windows)
└── release.yml                # tag → sign → build → GitHub Release (draft)
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop | Tauri 2.10, Rust |
| Frontend | React 19, TypeScript 5.9 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui (new-york) |
| State | Zustand 5 (7 domain slices) |
| Terminal | xterm.js 6 + WebGL addon + portable-pty (Rust) |
| Syntax | Shiki 3 (vitesse-dark theme) |
| Database | SQLite via rusqlite (bundled) |
| i18n | JSON locale files (English default) |
| Testing | Vitest + Testing Library (frontend), cargo test (backend) |
| Linting | ESLint 9 + Prettier (frontend), rustfmt + clippy (backend) |
| Package Manager | pnpm 10 |
| Build | Vite 7 |
| CI/CD | GitHub Actions (cross-platform builds, auto-update) |
| Icons | Lucide React + custom SVG (`components/icons.tsx`) |

## State (Zustand)

### Store Architecture

Combined store in `src/store/index.ts` merges **7 domain slices**:

| Slice | File | State |
|-------|------|-------|
| `TerminalSlice` | `features/terminal/store/terminalSlice.ts` | tabs, activeTab, exitedTabs, notifiedTabs |
| `ProjectSlice` | `features/project/store/projectSlice.ts` | projectPath, projectName, recentProjects, cliTools |
| `EditorSlice` | `features/editor/store/editorSlice.ts` | openFilePath, openFileContent |
| `PreviewSlice` | `features/preview/store/previewSlice.ts` | previewUrl, previewOpen, viewport |
| `ExplorerSlice` | `features/explorer/store/explorerSlice.ts` | fileTree, sidebarOpen, sidebarTab |
| `SettingsSlice` | `features/settings/store/settingsSlice.ts` | settings, splitRatio, UI toggles, update state |
| `GitSlice` | `features/git/store/gitSlice.ts` | gitInfo, projectStats |

**Usage**: `const value = useAppStore((s) => s.value)`

**Persisted to localStorage** (migrating to SQLite):
- `kodiq-project-path` — session restore
- `kodiq-recent-projects` — last 5 projects
- `kodiq-split-ratio` — panel split
- `kodiq-settings` — user preferences
- `kodiq-tabs-<path>` — per-project tab restore

### Adding State

1. Add types + actions to the appropriate slice in `features/<domain>/store/<domain>Slice.ts`
2. Export the slice creator and type from the feature's `index.ts`
3. The combined store auto-merges all slices

## Typed Tauri Bridge

All Rust↔JS calls go through `src/shared/lib/tauri.ts`. **No raw `invoke()` elsewhere.**

```tsx
import { terminal, fs, git, cli, db } from "@shared/lib/tauri";

// Terminal
await terminal.spawn({ command: "claude", cwd: "/path" });
await terminal.write(id, data);
await terminal.resize(id, cols, rows);
await terminal.close(id);

// Filesystem
const entries = await fs.readDir("/path");
const content = await fs.readFile("/path/file.ts");

// Git
const info = await git.getInfo("/path");
const stats = await git.getStats("/path");

// CLI
const tools = await cli.detectTools();

// Database
const projects = await db.projects.list();
await db.settings.set("key", "value");
const sessions = await db.sessions.list(projectId);
const history = await db.history.search("query");
const snippets = await db.snippets.list();
```

## Tauri Commands (Rust)

Modular structure in `src-tauri/src/`:

```rust
// Terminal (terminal/manager.rs)
spawn_terminal(command?, cwd?, shell?) -> String
write_to_pty(id, data)
resize_pty(id, cols, rows)
close_terminal(id)

// Filesystem (filesystem/read.rs)
read_dir(path) -> Vec<FileEntry>     // skips node_modules, .git, target
read_file(path) -> String            // max 1MB

// Git (git/info.rs)
get_git_info(path) -> JSON           // branch, commit, changes, ahead/behind
get_project_stats(path) -> JSON      // files, dirs, size, extensions, stack

// CLI (cli/detect.rs)
detect_cli_tools() -> Vec<CliTool>   // claude, gemini, codex, aider, ollama

// Database (db/*.rs)
db_list_projects() / db_create_project() / db_touch_project() / db_update_project()
db_get_setting() / db_set_setting() / db_get_all_settings()
db_list_sessions() / db_save_session() / db_close_session()
db_search_history() / db_add_history()
db_list_snippets() / db_create_snippet() / db_use_snippet()
```

**Events emitted**:
- `pty-output { id, data }` — terminal output
- `pty-exit { id }` — process finished
- `port-detected { id, port, url }` — localhost port found in output

## i18n

JSON locale files in `src/shared/i18n/`. English is default (always bundled), Russian is lazy-loaded.

```tsx
import { t } from "@shared/i18n";
<span>{t("terminals")}</span>  // -> "Terminals" (en) or "Терминалы" (ru)
```

All UI strings go through `t()`. Keys are camelCase English identifiers.

Locale files: `shared/i18n/en.json` and `shared/i18n/ru.json` (~97 keys).

## Error Handling

`src/shared/lib/errors.ts` provides centralized error handling:

```tsx
import { handleError, trySafe } from "@shared/lib/errors";

// Manual
try { ... } catch (e) { handleError(e, "Loading project"); }

// Wrapped async
const result = await trySafe(() => fs.readDir(path), "Reading directory");
```

Both log to console and show a toast via `sonner`.

## Design System

### Always dark. No light theme.

**Tokens** (defined in `app.css :root`):

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#08080a` | Main background |
| `--bg-raised` | `#0f1012` | Elevated surfaces |
| `--bg-surface` | `#141517` | Cards, panels |
| `--bg-overlay` | `#1a1b1e` | Modals, popovers |
| `--kodiq-accent` | `#14b8a6` | Brand teal — cursor, links, focus |
| `--accent-dim` | `rgba(20,184,166,0.12)` | Subtle accent backgrounds |
| `--accent-glow` | `rgba(20,184,166,0.25)` | Selection, glow effects |
| `--border-subtle` | `rgba(255,255,255,0.06)` | Primary borders |
| `--border-dim` | `rgba(255,255,255,0.03)` | Secondary borders |
| `--text-primary` | `#e8e8ec` | Primary text |
| `--text-secondary` | `#8b8b96` | Secondary text |
| `--text-tertiary` | `#52525c` | Dimmed text |

**Font**: `"JetBrains Mono", -apple-system, "SF Pro Text", system-ui, sans-serif`
**Letter spacing**: `-0.011em`
**Border radius**: `0.625rem` (shadcn `--radius`)

### Color Palette (inline classes)

Text colors used directly in components:
- `text-[#e4e4e7]` — bright text (labels, active items)
- `text-[#a1a1aa]` — medium text (hover states)
- `text-[#71717a]` — secondary text (descriptions)
- `text-[#52525c]` — dimmed text (icons, metadata)
- `text-[#3f3f46]` — very dim (timestamps, counts)
- `text-[#27272a]` — barely visible (separators)
- `text-[#14b8a6]` — accent teal (links, active indicators)

Backgrounds:
- `bg-white/[0.01]` through `bg-white/[0.08]` — subtle layers
- `bg-[#14b8a6]` — accent fills

### Sizing Conventions

- Font sizes: `text-[9px]` (badges), `text-[10px]` (metadata), `text-[11px]` (UI), `text-[12px]` (body), `text-[13px]` (prominent)
- Icon sizes: `size-2.5` (inline), `size-3` (small), `size-3.5` (medium), `size-4` (standard), `size-5` (empty states)
- Heights: `h-5` (chips), `h-6` (footer), `h-7` (inputs), `h-8` (buttons), `h-9` (toolbars), `h-[52px]` (title bar)
- Spacing: `gap-0.5`, `gap-1`, `gap-1.5`, `gap-2`, `gap-3` — compact UI

### Animations (defined in `app.css`)

- `anim-1` through `anim-5` — staggered fade-rise (80ms intervals)
- `.animate-float` — gentle vertical float (4s loop)
- `.animate-blink` — step-based blink
- `.glow-pulse` — opacity pulse (2s loop)
- `animate-pulse` — Tailwind built-in (used for notification badges)

## Components

### shadcn/ui (40 components installed)

All primitives available. Most used: `Button`, `Dialog`, `Tooltip`, `Input`, `Command`, `ScrollArea`, `Separator`, `Badge`, `ContextMenu`, `Sonner`.

**Style**: `new-york` variant, zinc base color.

**Button sizes** include custom `icon-xs` and `xs` variants.

### App Components

| Component | Purpose |
|-----------|---------|
| `App.tsx` | Layout, project lifecycle, shortcuts, port detection |
| `Sidebar` | Right panel — file tree + `ProjectOverview` at bottom |
| `TabBar` | Left panel — vertical terminal tabs, drag reorder, context menu |
| `XtermPanel` | Terminal renderer (xterm.js + WebGL + fit) |
| `FileViewer` | Full-screen code viewer with Shiki highlighting + breadcrumbs |
| `PreviewPanel` | iframe preview with responsive viewports |
| `CommandPalette` | command palette (cmdk) |
| `FileSearch` | fuzzy file finder |
| `ProjectOverview` | Git info + project stats (sidebar footer) |
| `QuickLaunch` | AI CLI quick launcher |
| `WelcomeScreen` | Start screen — recent projects, tools |
| `SettingsDialog` | Shell, font size, font family |
| `ErrorBoundary` | Error boundary with reload |
| `TreeItem` | Recursive file tree node |
| `icons.tsx` | KodiqIcon, KodiqDot, TabIconSvg, FileIcon |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `Cmd+T` | New terminal |
| `Cmd+W` | Close active tab |
| `Cmd+Shift+T` | Reopen closed tab |
| `Cmd+B` | Toggle sidebar |
| `Cmd+P` | File search |
| `Cmd+,` | Settings |
| `Cmd+1-9` | Switch tab |
| `Escape` | Close file viewer |

Implemented in `hooks/useKeyboardShortcuts.ts` via `react-hotkeys-hook`.

## Testing

### Frontend (Vitest)

```bash
pnpm run test              # single run
pnpm run test:watch        # watch mode
pnpm run test:coverage     # with coverage
```

Config in `vitest.config.ts`. Setup file `src/test/setup.ts` mocks all Tauri APIs.
Tests live next to source: `featureName.test.ts` inside the feature's store directory.

**Current tests**: 17 passing (terminalSlice: 10, settingsSlice: 7).

### Backend (cargo test)

```bash
pnpm run test:rust         # or: cd src-tauri && cargo test
```

**Current tests**: 23 passing (db migrations, projects, settings, sessions, history, snippets, port parser).

## Linting & Formatting

### Frontend

```bash
pnpm run lint              # ESLint 9 (TypeScript + React hooks + React Refresh)
pnpm run lint:fix          # ESLint with auto-fix
pnpm run format            # Prettier write
pnpm run format:check      # Prettier check
```

Config: `eslint.config.js` (flat config), `.prettierrc`, `.prettierignore`.
Ignores: `dist/`, `src-tauri/`, `src/components/ui/` (shadcn generated).

### Backend

```bash
pnpm run lint:rust         # clippy
pnpm run format:rust       # rustfmt
```

## CI/CD

### `ci.yml` — Pull Request / Push

Jobs: `lint-frontend` → `lint-rust` → `test-frontend` → `test-rust` → `build`
Build matrix: macOS (arm64 + x86_64), Ubuntu 22.04, Windows.

### `release.yml` — Git Tag

Triggered on `v*` tags. Builds signed binaries for all platforms. Creates draft GitHub Release.
Requires secrets: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

## Conventions

### Naming
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Store slices: `featureSlice.ts`
- Tauri commands: `snake_case`
- i18n keys: `camelCase`
- CSS tokens: `--kebab-case`

### Patterns
- `cn()` for conditional Tailwind classes (clsx + tailwind-merge)
- `terminal.spawn()` / `fs.readDir()` / `db.projects.list()` — typed Tauri bridge (no raw invoke)
- `listen<T>("event", handler)` for Tauri events
- `t("key")` for all UI strings
- `handleError(e, context)` for error handling with toast
- All raw `<button>` / `<input>` -> shadcn `<Button>` / `<Input>`
- Borders: `border-white/[0.06]` (inline opacity)
- Hover: `hover:bg-white/[0.02]` or `hover:bg-white/[0.04]`

### Import Order
1. React / external libs
2. Tauri APIs (`@tauri-apps/*`)
3. UI libraries (sonner, lucide, cmdk)
4. Shared (`@shared/lib/*`, `@shared/i18n`)
5. Store (`@/store`)
6. Feature imports (`@features/*`)
7. shadcn components (`@/components/ui/*`)
8. App components (`@/components/*`)
9. Hooks (`@/hooks/*`)
10. CSS (last)

### Section Comments
```tsx
// ── Section Name ──────────────────────────────────────────────────────
```

### Path Aliases
```
@         -> src/
@features -> src/features/
@shared   -> src/shared/
```

## Terminal Theme

Defined in `shared/lib/constants.ts`:

```
Background: #0a0a0c   Foreground: #c8c8d0   Cursor: #14b8a6
Selection: rgba(20, 184, 166, 0.25)
```

16 ANSI colors from Tailwind palette (red-400, green-400, yellow-400, etc.).

## Common Tasks

### Add a new Tauri command
1. Add function in the appropriate Rust module (`src-tauri/src/<domain>/<file>.rs`) with `#[tauri::command]`
2. Export via the module's `mod.rs`
3. Register in `lib.rs` `invoke_handler` with full path (e.g., `terminal::manager::spawn_terminal`)
4. Add typed wrapper in `src/shared/lib/tauri.ts`
5. Call from React via the typed bridge (e.g., `terminal.spawn(...)`)

### Add a new component
1. For shadcn: `pnpm dlx shadcn@latest add <component>`
2. For custom: create in the appropriate `features/<domain>/components/`
3. All text through `t()`, add keys to `shared/i18n/en.json` and `shared/i18n/ru.json`

### Add a new i18n key
1. Add to `src/shared/i18n/en.json` (required)
2. Add to `src/shared/i18n/ru.json` (translation)
3. Use: `t("keyName")`

### Add state
1. Add types + actions to the appropriate slice in `features/<domain>/store/<domain>Slice.ts`
2. The combined store in `store/index.ts` auto-merges all slices
3. Export types from the feature's `index.ts` if needed externally

### Add a new store slice
1. Create `features/<domain>/store/<domain>Slice.ts` using `StateCreator` pattern
2. Export `create<Domain>Slice` and `<Domain>Slice` type
3. Add to combined store in `store/index.ts`

### Add a test
1. Create `<name>.test.ts` next to the source file
2. Use Vitest: `describe`, `it`, `expect`
3. For store tests, create isolated Zustand store: `create<SliceType>()(createSlice)`
4. Run: `pnpm run test`

## Database

SQLite database at `~/.config/kodiq/kodiq.db`. Auto-migrated on startup.

### Schema

Tables: `_migrations`, `projects`, `terminal_sessions`, `settings`, `command_history`, `snippets`.

### Migrations

`src-tauri/src/db/migrations.rs` — versioned SQL migrations applied sequentially.
Add new migrations by incrementing the version number and adding SQL to the array.

## Compatibility Layer

Old imports (`@/lib/store`, `@/lib/i18n`, `@/lib/constants`, `@/lib/utils`) still work via shim files in `src/lib/` that re-export from new locations. Existing components don't need immediate migration.

## File Structure Quick Reference

```
src/store/index.ts              -> Combined Zustand store (7 slices)
src/shared/lib/types.ts         -> All shared TypeScript types
src/shared/lib/tauri.ts         -> Typed Tauri bridge (all invoke calls)
src/shared/lib/errors.ts        -> handleError(), trySafe()
src/shared/lib/constants.ts     -> CLI_COLORS, XTERM_THEME
src/shared/lib/utils.ts         -> cn() utility
src/shared/i18n/index.ts        -> t(), setLocale(), getLocale()
src/shared/i18n/en.json         -> English strings (default)
src/shared/i18n/ru.json         -> Russian strings
src/features/*/store/*Slice.ts  -> Domain state slices
src/app.css                     -> Design tokens, xterm styles, animations
src/App.tsx                     -> Main layout, project lifecycle
src/lib/*.ts                    -> Compatibility shims (re-export from new locations)
src-tauri/src/lib.rs            -> Tauri app setup + command registration
src-tauri/src/terminal/         -> PTY management + port parser
src-tauri/src/filesystem/       -> Directory + file reading
src-tauri/src/git/              -> Git info + project stats
src-tauri/src/cli/              -> CLI tool detection
src-tauri/src/db/               -> SQLite database layer + migrations
```

## Project Documents

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | This file — AI assistant instructions, conventions, patterns |
| `ARCHITECTURE.md` | Technical architecture — tech stack, modules, data layer |
| `ROADMAP.md` | Product roadmap — Now / Next / Later with status tracking |
| `COMPETITIVE-BRIEF.md` | Competitive analysis — Warp, Wave, Ghostty, Tabby |
| `VISION.md` | Long-term product vision — community, deploy, mobile |
