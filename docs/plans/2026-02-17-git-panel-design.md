# Git Panel — Design Document

**Date:** 2026-02-17
**Scope:** Stage/Unstage files + Commit (no push/pull yet)
**Location:** 4th tab in right Activity Bar

---

## Architecture

### Rust Backend — `src-tauri/src/git/info.rs`

New Tauri commands (all use `std::process::Command` to call git CLI):

| Command | Git CLI | Returns |
|---------|---------|---------|
| `git_stage` | `git add <files>` | `()` |
| `git_unstage` | `git reset HEAD <files>` | `()` |
| `git_stage_all` | `git add -A` | `()` |
| `git_unstage_all` | `git reset HEAD` | `()` |
| `git_commit` | `git commit -m "<msg>"` | `{ hash, message }` |
| `git_diff` | `git diff [--cached] -- <file>` | `string` (raw diff) |

All return `Result<T, KodiqError>`.

**Breaking change to `get_git_info`:** Split `changedFiles` into `stagedFiles` and `unstagedFiles` using porcelain XY columns:
- X column (index) → staged
- Y column (worktree) → unstaged
- `??` → untracked (shown in unstaged)

### Frontend

**New files:**
- `src/features/git/components/GitPanel.tsx` — main panel component
- `src/features/git/components/FileList.tsx` — reusable staged/unstaged file list

**Modified files:**
- `src/shared/lib/types.ts` — add `StagedFile` type, update `GitInfo`
- `src/shared/lib/types.ts` — extend `SidebarTab` with `"git"`
- `src/features/git/store/gitSlice.ts` — add commit message state, loading states
- `src/features/explorer/components/ActivityBar.tsx` — add Git icon tab
- `src/shared/i18n/en.json` + `ru.json` — git panel strings

**UI layout (top to bottom):**
1. Header: "Source Control" + file count badge
2. Commit input: textarea + Commit button (disabled when empty or no staged files)
3. Staged Changes section: collapsible, "−" button per file, "Unstage All" header action
4. Changes section: collapsible, "+" button per file, "Stage All" header action
5. File click → show diff in FileViewer (reuse existing component)

**Icon:** `GitBranch` from lucide-react (already imported in ProjectOverview)

### Data Flow

```
User clicks "+" on file
  → invoke("git_stage", { path, files: ["src/foo.rs"] })
  → Rust runs `git add src/foo.rs`
  → success → filesystem watcher fires `git-changed` event
  → frontend listener calls get_git_info → re-renders GitPanel
```

No manual refresh needed — the existing `notify` watcher on `.git/` directory already emits `git-changed` events on stage/commit.

### Commit Flow

```
User types message + clicks Commit
  → invoke("git_commit", { path, message })
  → Rust runs `git commit -m "message"`
  → success → toast "Committed abc1234"
  → clear commit message textarea
  → git-changed event auto-refreshes panel
```

---

## Decisions

- **git CLI, not libgit2** — consistent with existing `get_git_info`, no new deps
- **No push/pull** — deferred to next iteration
- **Diff in FileViewer** — reuse existing read-only code viewer, pass diff content
- **No partial staging (hunks)** — whole file only, keeps it simple for beginners
