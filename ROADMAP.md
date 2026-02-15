# Kodiq — Roadmap

> Open-source desktop for AI CLI tools — one window for all your AI coding agents.

Target audience: **developers who already use AI CLI tools** (Claude Code, Gemini CLI, Codex, Aider, Ollama).

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
- [ ] CLI detection screen on first launch — show which tools are installed
- [ ] "Install missing CLI" buttons (open brew/npm install instructions)
- [ ] Quick start wizard: select project folder → detect tools → open terminal
- [ ] Smart default shell: detect user's preferred shell (zsh/bash/fish)

### Terminal Session Restore
- [ ] Save open tabs to SQLite on close (already have `terminal_sessions` table)
- [ ] Restore tabs on next launch (label, command, cwd, sort order)
- [ ] "Reopen closed tab" action (Cmd+Shift+T)

### Quick Launch Improvements
- [ ] Show only installed CLIs (currently shows all)
- [ ] Per-project default CLI (stored in `projects.default_cli`)
- [ ] Recent commands quick-pick

### CLI Output Intelligence — Phase 1
- [ ] Port detection → auto-open preview (already have port parser, needs UI trigger)
- [ ] Detect code blocks in CLI output (fenced ``` blocks)
- [ ] "Copy code" button overlay on detected code blocks
- [ ] Detect file paths in output → make clickable (open in file viewer)

### Auto-Update UI
- [ ] Generate signing keypair, configure `tauri.conf.json` pubkey
- [ ] UpdateBadge component in title bar (persistent dot + version)
- [ ] UpdateDialog with changelog + progress bar
- [ ] Toast notification on first detection

### Cross-Platform Polish
- [ ] Test and fix Windows build (path separators, shell detection)
- [ ] Linux .deb + .AppImage builds
- [ ] macOS: code signing + notarization for Gatekeeper

### Settings Persistence
- [ ] Migrate remaining localStorage keys to SQLite
- [ ] Settings load from DB on startup → Zustand hydration
- [ ] Settings write to both Zustand + DB on change

---

## Next (v0.4.0) — CLI Intelligence

Goal: **Kodiq adds real value on top of raw CLI output** — the core differentiator vs plain terminals.

Estimated: 4-6 weeks after v0.3.0.

### CLI Output Parsing Engine
- [ ] `CliParser` trait in Rust — pluggable per-CLI parsers
- [ ] Claude Code parser: detect diffs, code blocks, tool use, errors
- [ ] Gemini CLI parser: detect responses, code blocks
- [ ] Aider parser: detect file edits, commits
- [ ] `ParsedBlock` enum: CodeBlock, Diff, Markdown, Error, Progress, Action

### Action Buttons
- [ ] "Apply diff" — apply parsed diff to file on disk
- [ ] "Run command" — execute suggested command in new tab
- [ ] "Reject" — skip suggested change
- [ ] "Open file" — open mentioned file in file viewer
- [ ] Button overlay rendered in xterm viewport (CSS positioned above terminal)

### Rich Terminal Rendering
- [ ] Syntax-highlighted code blocks in terminal output
- [ ] Collapsible long outputs (tool results, file contents)
- [ ] Diff viewer inline (side-by-side or unified)
- [ ] Progress indicators for long AI operations

### Git Event System
- [ ] `notify` crate — replace setInterval polling with filesystem events
- [ ] Auto-refresh file tree on changes
- [ ] Auto-refresh git status on `.git/` changes
- [ ] `thiserror` crate — typed `KodiqError` replacing raw strings

### Git Panel
- [ ] Sidebar tab: branch, changed files count
- [ ] Stage/unstage individual files
- [ ] Commit with message
- [ ] Push/pull with progress

---

## Later — Product Expansion

Features that make Kodiq a full development environment. No fixed timeline.

### Developer Experience
- [ ] CodeMirror 6 integration (replace read-only Shiki with editable code)
- [ ] Multi-terminal layouts (split horizontal/vertical)
- [ ] Task runner: detect and run package.json scripts, Makefiles
- [ ] Command history search across all sessions (from SQLite)
- [ ] Snippet manager with tags and search
- [ ] SSH remote terminals

### Chat Mode
- [ ] Visual chat UI layer over terminal (messenger-like bubbles)
- [ ] Toggle: Terminal mode / Chat mode / Hybrid
- [ ] Markdown rendering of AI responses
- [ ] Separate from CLI Output Intelligence — works on top of it

### GitHub Integration
- [ ] Issues: list, create, comment (via `gh` CLI)
- [ ] Pull Requests: create, review, merge
- [ ] Actions: view workflow status
- [ ] Visual diff viewer with syntax highlighting

### Pro Layer (Supabase)
- [ ] Supabase Auth (email, GitHub OAuth, Google OAuth)
- [ ] Settings sync (SQLite ↔ Supabase)
- [ ] Project sharing and community feed
- [ ] Cloud deploy (Vercel/Netlify integration)
- [ ] Team workspaces

### Visual Inspector
- [ ] Click element in preview → highlight in code
- [ ] "This doesn't work" → send context to CLI agent
- [ ] Drag & drop UI editing → AI updates code

### Mobile
- [ ] iOS/Android via Tauri v2
- [ ] Sync with desktop

---

## Prioritization Rationale

The roadmap is shaped by competitive analysis (see [COMPETITIVE-BRIEF.md](./COMPETITIVE-BRIEF.md)):

1. **Now focuses on launch basics** — session restore, onboarding, auto-update. Without these, the app isn't usable for daily work.

2. **Next prioritizes CLI Output Intelligence** — this is Kodiq's #1 differentiator. No other terminal does this. Warp has AI built-in but requires their API. Kodiq parses output from *any* CLI tool the user already has.

3. **Git panel is in Next** because every competitor (Warp, Wave) already has git integration. It's table stakes, not a differentiator.

4. **Chat mode is in Later** because it's a visual layer, not core functionality. CLI Output Intelligence (parsing + action buttons) delivers more value with less effort.

5. **Pro/social features are last** — monetization comes after product-market fit.

---

## Version History

| Version | Date | Focus |
|---------|------|-------|
| v0.1.0 | 2025-01 | Initial prototype — terminal + preview |
| v0.2.0 | 2026-02 | Foundation refactor — modular Rust, Zustand slices, SQLite, testing, CI/CD |
| v0.3.0 | TBD | Launch ready — onboarding, session restore, auto-update, basic CLI intelligence |
| v0.4.0 | TBD | CLI Intelligence — parsers, action buttons, git panel |

---

*Last updated: 2026-02-15*
