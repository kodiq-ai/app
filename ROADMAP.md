# Kodiq — Roadmap

> Open-source desktop for AI CLI tools — one window for all your AI coding agents.

Target audience: **beginners learning to code with AI** (via Kodiq Academy) + **developers who already use AI CLI tools**. Dual-mode: beginner-friendly defaults, pro mode for power users.

Framework: **Now / Next / Later** with status tracking.

See also: [COMPETITIVE-BRIEF.md](./COMPETITIVE-BRIEF.md) for market context, [VISION.md](./VISION.md) for long-term product vision.

---

## Done (v0.2.0)

Foundation refactor completed. Kodiq went from a prototype to an industrial-grade modular codebase.

### Data Layer
- [x] SQLite via rusqlite (bundled) — `~/.config/kodiq/kodiq.db`
- [x] Migration system with versioned schema (auto-applies on startup)
- [x] Tables: `projects`, `terminal_sessions`, `settings`, `command_history`, `snippets`
- [x] tauri-plugin-store for sensitive config

### Rust Backend (modular)
- [x] Split monolith `lib.rs` → `terminal/`, `filesystem/`, `git/`, `cli/`, `db/` modules
- [x] `state.rs` with AppState + DbState
- [x] Clean `lib.rs` — module registration only (~70 lines)
- [x] uuid + chrono in Cargo.toml
- [x] rustfmt.toml + cargo clippy passes clean

### Frontend (feature-based)
- [x] Zustand store split into 7 domain slices
- [x] Typed Tauri bridge (`shared/lib/tauri.ts`) — no raw `invoke()` elsewhere
- [x] Shared types (`shared/lib/types.ts`)
- [x] Feature-based structure (`features/terminal`, `editor`, `explorer`, `preview`, `git`, `project`, `settings`)
- [x] i18n: English default + Russian lazy-loaded (JSON locale files, ~97 keys)
- [x] `src/pro/` stub with `__PRO__` conditional flag
- [x] Path aliases: `@`, `@features`, `@shared`

### Error Handling
- [x] Centralized `handleError()` + `trySafe()` with toast notifications
- [x] `ErrorBoundary` component wrapping each feature
- [x] All Rust commands return `Result<T, String>`

### Testing
- [x] Vitest + Testing Library + jsdom setup
- [x] 17 frontend tests (terminalSlice: 10, settingsSlice: 7)
- [x] 23 Rust tests (db migrations, projects, settings, sessions, history, snippets, port parser)

### Linting & CI/CD
- [x] ESLint 9 (flat config) + Prettier
- [x] rustfmt + clippy
- [x] GitHub Actions: ci.yml (lint → test → build matrix)
- [x] GitHub Actions: release.yml (tag → sign → build → GitHub Release)

### Auto-Update
- [x] tauri-plugin-updater + tauri-plugin-process
- [x] Update state in Zustand settingsSlice
- [x] Signing infrastructure ready (needs keypair generation for production)

---

## Now (v0.3.0) — Launch Ready

Goal: **ship a usable product** for developers who already have AI CLIs installed.

Estimated: 3-4 weeks.

### Onboarding & First Run
- [x] CLI detection screen on first launch — show which tools are installed
- [x] "Install missing CLI" buttons (open brew/npm install instructions)
- [x] Quick start wizard: select project folder → detect tools → open terminal
- [x] Smart default shell: detect user's preferred shell (zsh/bash/fish)

### Terminal Session Restore
- [x] Save open tabs to SQLite on close (already have `terminal_sessions` table)
- [x] Restore tabs on next launch (label, command, cwd, sort order)
- [x] "Reopen closed tab" action (Cmd+Shift+T)

### Quick Launch Improvements
- [x] Show only installed CLIs (filter by `installed` flag)
- [x] Per-project default CLI (stored in `projects.default_cli`, context menu UI)
- [x] Recent commands quick-pick

### CLI Output Intelligence — Phase 1
- [x] Port detection → auto-open preview + toast (configurable `autoOpenPreview` setting)
- [x] Project activity log — sidebar tab tracking commands + git diffs per session
- [x] Detect file paths in output → clickable via custom xterm.js ILinkProvider
- [x] Output section markers (teal dots at section boundaries; full collapse deferred to v0.4.0)

### Auto-Update UI
- [x] Generate signing keypair, configure `tauri.conf.json` pubkey
- [x] UpdateBadge component in title bar (persistent dot + version)
- [x] UpdateDialog with changelog + progress bar
- [x] Toast notification on first detection

### Cross-Platform Polish
- [x] Test and fix Windows build (path separators, shell detection, `where` vs `which`)
- [x] Linux .deb + .AppImage builds (Tauri bundler auto-generates via release.yml)
- [x] macOS: code signing + notarization for Gatekeeper (Developer ID Application cert + notarytool)

### Settings Persistence
- [x] Migrate remaining localStorage keys to SQLite (all 7 keys migrated, localStorage removed)
- [x] Settings load from DB on startup → Zustand hydration (`loadSettingsFromDB`)
- [x] Settings write to both Zustand + DB on change (dual-write removed, DB-only now)

---

## Next (v0.4.0) — Smart Workflow

Goal: **make Kodiq the easiest way to start coding with AI** — Launch Configurations + native filesystem events.

Estimated: 2-3 weeks after v0.3.0.

### Launch Configurations
- [x] SQLite-backed CLI profiles with per-project/global scope
- [x] Auto-generate default configs for installed CLI tools on first project open
- [x] LaunchConfigDialog — create/edit with CLI selector, args, env vars, scope
- [x] QuickLaunch sidebar: one-click launch + context menu (Run/Edit/Delete)
- [x] "Run last" shortcut (Cmd+Shift+L) — relaunch previous config
- [x] Custom env vars passed to PTY on launch

### Git Event System
- [x] `notify` crate — replace setInterval polling with filesystem events
- [x] Auto-refresh file tree on changes
- [x] Auto-refresh git status on `.git/` changes
- [x] `thiserror` crate — typed `KodiqError` replacing raw strings

---

## Later — Ecosystem & Pro

Features that connect Kodiq IDE with Academy and monetization. No fixed timeline.

### Easy Deploy
- [ ] "Publish" button in toolbar — deploy current project to web
- [ ] Vercel/Netlify integration via their CLI (detect framework, auto-configure)
- [ ] Deploy status panel: URL, build log, last deploy time
- [ ] Custom domain setup wizard

### Git Panel
- [ ] Sidebar tab: branch, changed files count
- [ ] Stage/unstage individual files
- [ ] Commit with message
- [ ] Push/pull with progress

### Developer Experience
- [ ] CodeMirror 6 integration (replace read-only Shiki with editable code)
- [ ] Multi-terminal layouts (split horizontal/vertical)
- [ ] Command history search across all sessions (from SQLite)
- [ ] Snippet manager with tags and search

### Pro Layer (Supabase)
- [ ] Supabase Auth (email, GitHub OAuth, Google OAuth)
- [ ] Settings sync (SQLite ↔ Supabase)
- [ ] Cloud deploy (Vercel/Netlify integration)
- [ ] Academy progress integration (show course progress in IDE)
- [ ] Team workspaces

---

## Prioritization Rationale

The roadmap is shaped by target audience (beginners from Academy) and competitive analysis (see [COMPETITIVE-BRIEF.md](./COMPETITIVE-BRIEF.md)):

1. **v0.3.0 shipped launch basics** — session restore, onboarding, auto-update. Foundation is solid.

2. **v0.4.0 focuses on workflow, not parsing** — modern AI CLIs (Claude Code, Gemini CLI) already have excellent UX. Parsing their output adds complexity without proportional value. Launch Configurations make Kodiq uniquely easy for beginners. IDE-like Input Editor was removed — AI CLIs manage their own prompts, autocomplete, and interactive menus through the PTY; intercepting input would break their UX.

3. **CLI Output Intelligence (parsing) was deprioritized** — it was the original differentiator plan, but AI CLIs have evolved faster than expected. They already format output well, handle diffs internally, and provide their own action prompts. Kodiq's real differentiator is the ecosystem: Academy teaches → IDE provides workspace → Deploy ships the result.

4. **Git panel moved to Later** — CLI agents already handle git well. Visual git is nice-to-have, not a blocker.

5. **Removed from roadmap**: Chat mode (CLIs are already chat-like), Visual Inspector (AI understands text better than clicks), Mobile (not viable for coding), Social feed (Discord/Telegram solve this better).

6. **Easy Deploy is the key Later feature** — "I built something → it's on the internet" is the magic moment for Academy students.

---

## Version History

| Version | Date | Focus |
|---------|------|-------|
| v0.1.0 | 2025-01 | Initial prototype — terminal + preview |
| v0.2.0 | 2026-02 | Foundation refactor — modular Rust, Zustand slices, SQLite, testing, CI/CD |
| v0.3.0 | 2026-02 | Launch ready — onboarding, session restore, auto-update, basic CLI intelligence |
| v0.4.0 | 2026-02 | Smart Workflow — Launch Configurations, native filesystem events |

---

*Last updated: 2026-02-17*
