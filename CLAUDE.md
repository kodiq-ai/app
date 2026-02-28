# Kodiq App — AI Terminal IDE

Tauri 2 desktop app: Rust backend + React 19 frontend. Dark-only, English/Russian UI.

## Commands

```bash
pnpm run tauri:dev       # dev mode
pnpm run tauri:build     # production build
pnpm run check:all       # lint + format + test (MUST pass before commits)
pnpm run test            # Vitest (frontend)
pnpm run test:rust       # cargo test (backend)
```

## Critical Rules

- **Typed Tauri bridge**: all Rust<->JS calls via `src/shared/lib/tauri.ts` — NEVER raw `invoke()`
- **i18n**: all UI strings via `t("key")` — add keys to BOTH `en.json` and `ru.json`
- **Error handling**: use `handleError(e, ctx)` / `trySafe(fn, ctx)` from `@shared/lib/errors`
- **Styling**: shadcn/ui (new-york), Tailwind v4. Dark only. Use design tokens from `app.css`
- **State**: Zustand 5 — 8 domain slices merged in `src/store/index.ts`
- **Editor**: CodeMirror 6 (multi-tab, dirty tracking, save). NOT Shiki (removed in v0.4.0)
- **Borders**: `border-white/[0.06]` | **Hover**: `hover:bg-white/[0.04]`
- **Section comments**: `// ── Section Name ──────────────────────────`

## Architecture (high-level)

```
src/features/          8 domains: terminal, editor, project, explorer,
                       git, preview, settings, activity
src/shared/lib/        tauri.ts, types.ts, errors.ts, constants.ts, utils.ts
src/shared/i18n/       en.json, ru.json, index.ts (t(), setLocale())
src/store/index.ts     Combined Zustand store (8 slices auto-merged)
src/App.tsx            Root layout: editor (top) + terminal (bottom) + sidebar
src/components/ui/     shadcn/ui primitives (40 components)

src-tauri/src/         Rust modules: terminal/, filesystem/, git/, cli/, db/
```

## Path Aliases

- `@` → `src/`  |  `@features` → `src/features/`  |  `@shared` → `src/shared/`

## Common Tasks

**New Tauri command**: Rust fn with `#[tauri::command]` → `mod.rs` export → register in `lib.rs` → typed wrapper in `tauri.ts`

**New component**: `features/<domain>/components/` + i18n keys in both locales

**New state**: add to appropriate `features/<domain>/store/<domain>Slice.ts` — auto-merged

**New test**: `<name>.test.ts` next to source, isolated Zustand store: `create<Slice>()(createSlice)`

**shadcn component**: `pnpm dlx shadcn@latest add <name>`

## Git & GitHub Workflow

> **Repo**: `kodiq-ai/ide` (PUBLIC, Apache 2.0)

```bash
# Новая ветка от main
git fetch origin main && git checkout -b <type>/<desc> origin/main

# Коммит и пуш
git add <файлы> && git commit -m "type: description"
git push -u origin HEAD

# PR → CI → merge (squash)
gh pr create --title "type: description" --body "..."
gh pr merge --squash --delete-branch
```

### Branch Protection (main)

- **Squash-only merge** — merge commit и rebase запрещены
- **Required reviews: 0** — CI должен пройти, approve не требуется
- **Enforce admins: true** — правила применяются ко всем, включая owner
- **Force push / branch delete: blocked**
- **Auto-merge: enabled** — `gh pr merge --auto --squash`

### Security

- **Secret scanning + push protection** — включён (блокирует коммиты с токенами/ключами)
- **Dependabot security updates** — включён (автоматические PR для уязвимостей)
- **Workflow permissions: read-only** — Actions не могут писать в репо без explicit permissions
- **Actions cannot approve PRs**

### CI Checks

Все проверки должны пройти перед merge:
- `lint-frontend` — ESLint
- `lint-rust` — cargo clippy
- `test-frontend` — Vitest
- `test-rust` — cargo test
- `build` — Tauri build (runs after all tests pass)

## Detailed Rules

See `.claude/rules/` for: architecture, commands, conventions, testing.
