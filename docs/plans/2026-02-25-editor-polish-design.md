# Editor Polish (v0.5.0) — Design Document

**Date:** 2026-02-25
**Scope:** Status Bar, Go to Line, Find & Replace
**Issues:** #1 (Find & Replace), #2 (Go to Line), #7 (Status Bar)

---

## 1. Status Bar

**File:** `src/features/editor/components/EditorStatusBar.tsx`
**Placement:** Bottom of `EditorPanel`, between `CodeMirrorEditor` and `UnsavedDialog`.

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Ln 42, Col 13 (24 selected)    UTF-8 · Spaces: 2 · TypeScript │
└─────────────────────────────────────────────────────┘
```

- Height: `h-6`, border-t, `bg-surface` background
- Left: `Ln {line}, Col {col}` + optional `({count} selected)` when selection exists
- Right: `UTF-8` · `Spaces: {tabSize}` · `{language}`

### Data Source

CM6 `updateListener` extension — on every transaction, read:
- `state.selection.main.head` → line/col via `state.doc.lineAt()`
- Selection range length for selection count
- Tab size from editor state
- Language from `editorSlice` active tab

### Visibility

Rendered only when `activeEditorTab !== null`. Hidden when no file is open.

---

## 2. Go to Line

**File:** `src/features/editor/components/GoToLineDialog.tsx`
**Shortcut:** `Cmd+G` (Mac) / `Ctrl+G` (Windows/Linux)

### Behavior

1. `Cmd+G` opens a centered modal dialog over the editor
2. Input field with autofocus, placeholder: `Go to Line (1 – {totalLines})`
3. Enter → validate range → jump to line → close dialog
4. Escape → close without action

### Jump Logic

```ts
const line = state.doc.line(clampedLineNumber);
view.dispatch({
  selection: EditorSelection.cursor(line.from),
  scrollIntoView: true,
});
```

### Registration

Global shortcut via `useHotkeys("mod+g", ...)` in `useKeyboardShortcuts.ts`.

---

## 3. Find & Replace

**File:** `src/features/editor/components/FindReplacePanel.tsx`
**Shortcuts:** `Cmd+F` (Find), `Cmd+H` (Find + Replace)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ [Find input_______] [Aa] [.*]   3 of 17  [↑] [↓] [×] │
│ [Replace input____]            [Replace] [Replace All] │
└─────────────────────────────────────────────────────┘
```

- Overlay panel at top of editor area (absolute positioned within relative container)
- Replace row shown only when opened via `Cmd+H`
- `[Aa]` = Match Case toggle, `[.*]` = Regex toggle
- Match counter: `{current} of {total}`

### CM6 Integration

- Use `@codemirror/search` API: `SearchQuery`, `search()`, `findNext`, `findPrevious`, `replaceNext`, `replaceAll`
- Disable native CM6 search panel (override `openSearchPanel` keybinding)
- Highlight matches via CM6 search decorations (already styled in `kodiqTheme.ts`)

### Auto-fill

If text is selected when `Cmd+F` is pressed, pre-fill the search input with the selection.

### State

Local React state — no Zustand needed. Panel open/close + query + flags.

---

## General

### i18n

Add keys to both `en.json` and `ru.json`:
- `statusBar.line`, `statusBar.col`, `statusBar.selected`, `statusBar.spaces`
- `goToLine.title`, `goToLine.placeholder`
- `findReplace.find`, `findReplace.replace`, `findReplace.matchCase`, `findReplace.regex`, `findReplace.noResults`, `findReplace.replaceAll`

### Styling

All components use Tailwind + design tokens (`bg-surface`, `border-default`, `text-secondary`). No hardcoded colors.

### Version

Bump to `v0.5.0` after all three features ship.
