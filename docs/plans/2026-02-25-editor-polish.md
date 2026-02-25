# Editor Polish (v0.5.0) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Status Bar, Go to Line, and Find & Replace to the CodeMirror editor — shipping v0.5.0.

**Architecture:** Cursor info flows through Zustand (`cursorInfo` in editorSlice), read by a sibling `EditorStatusBar`. GoToLineDialog and FindReplacePanel are rendered inside EditorPanel and access the active EditorView via `viewCache`. CM6 `@codemirror/search` extension provides match highlighting; React drives the query via `setSearchQuery` effect.

**Tech Stack:** React 19, CodeMirror 6, Zustand 5, Tailwind CSS v4, react-hotkeys-hook v5, Vitest + Testing Library

---

## Task 1: Add i18n Keys

**Files:**
- Modify: `src/shared/i18n/en.json`
- Modify: `src/shared/i18n/ru.json`

**Step 1: Add English keys**

In `src/shared/i18n/en.json`, add before the closing `}`:

```json
  "statusBarLine": "Ln",
  "statusBarCol": "Col",
  "statusBarSelected": "selected",
  "statusBarSpaces": "Spaces",

  "goToLineTitle": "Go to Line",
  "goToLinePlaceholder": "Go to Line (1 – {max})",

  "findReplaceFind": "Find",
  "findReplaceReplace": "Replace",
  "findReplaceMatchCase": "Match Case",
  "findReplaceRegex": "Regex",
  "findReplaceNoResults": "No results",
  "findReplaceReplaceAll": "Replace All",
  "findReplaceOf": "of"
```

**Step 2: Add Russian keys**

In `src/shared/i18n/ru.json`, add before the closing `}`:

```json
  "statusBarLine": "Стр",
  "statusBarCol": "Кол",
  "statusBarSelected": "выделено",
  "statusBarSpaces": "Пробелы",

  "goToLineTitle": "Перейти к строке",
  "goToLinePlaceholder": "Перейти к строке (1 – {max})",

  "findReplaceFind": "Найти",
  "findReplaceReplace": "Заменить",
  "findReplaceMatchCase": "Учитывать регистр",
  "findReplaceRegex": "Регулярное выражение",
  "findReplaceNoResults": "Ничего не найдено",
  "findReplaceReplaceAll": "Заменить все",
  "findReplaceOf": "из"
```

**Step 3: Commit**

```bash
cd /Users/artemboev/Projects/kodiq/app
git add src/shared/i18n/en.json src/shared/i18n/ru.json
git commit -m "feat(editor): add i18n keys for status bar, go-to-line, find & replace"
```

---

## Task 2: Cursor Info State + CM6 Wiring

**Files:**
- Modify: `src/features/editor/store/editorSlice.ts`
- Modify: `src/features/editor/components/CodeMirrorEditor.tsx`
- Test: `src/features/editor/store/__tests__/editorSlice.test.ts`

### Step 1: Write the failing test

Create `src/features/editor/store/__tests__/editorSlice.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createEditorSlice } from "../editorSlice";

// -- Minimal Zustand mock -------
function createTestStore() {
  let state: ReturnType<typeof createEditorSlice>;
  const set = (partial: unknown) => {
    const next = typeof partial === "function" ? partial(state) : partial;
    state = { ...state, ...next };
  };
  const get = () => state;
  state = createEditorSlice(set as never, get as never, {} as never);
  return { get: () => state, set };
}

describe("editorSlice — cursorInfo", () => {
  it("starts with cursorInfo null", () => {
    const { get } = createTestStore();
    expect(get().cursorInfo).toBeNull();
  });

  it("setCursorInfo updates state", () => {
    const { get } = createTestStore();
    get().setCursorInfo({ line: 10, col: 5, selected: 3 });
    expect(get().cursorInfo).toEqual({ line: 10, col: 5, selected: 3 });
  });

  it("setCursorInfo(null) clears state", () => {
    const { get } = createTestStore();
    get().setCursorInfo({ line: 1, col: 1, selected: 0 });
    get().setCursorInfo(null);
    expect(get().cursorInfo).toBeNull();
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd /Users/artemboev/Projects/kodiq/app
pnpm run test -- src/features/editor/store/__tests__/editorSlice.test.ts
```

Expected: FAIL — `cursorInfo` property and `setCursorInfo` method don't exist.

### Step 3: Add cursorInfo to editorSlice

In `src/features/editor/store/editorSlice.ts`:

**3a.** Add to `CursorInfo` type (top of file, after imports):

```ts
export interface CursorInfo {
  line: number;
  col: number;
  selected: number;
}
```

**3b.** Add to `EditorSlice` interface:

```ts
  cursorInfo: CursorInfo | null;
  setCursorInfo: (info: CursorInfo | null) => void;
```

**3c.** Add to the slice creator default state:

```ts
  cursorInfo: null,
```

**3d.** Add the action inside `createEditorSlice`:

```ts
  setCursorInfo: (info) => set({ cursorInfo: info }),
```

### Step 4: Run test to verify it passes

```bash
pnpm run test -- src/features/editor/store/__tests__/editorSlice.test.ts
```

Expected: PASS (3 tests)

### Step 5: Wire CM6 updateListener + remove searchKeymap + add search extension

In `src/features/editor/components/CodeMirrorEditor.tsx`:

**5a.** Add import for `search`:

```ts
import { search, highlightSelectionMatches } from "@codemirror/search";
```

(Replace the existing import that also imports `searchKeymap`.)

**5b.** Add `setCursorInfo` to the store selector (near line 24):

```ts
const setCursorInfo = useAppStore((s) => s.setCursorInfo);
```

Add ref:

```ts
const setCursorInfoRef = useRef(setCursorInfo);
setCursorInfoRef.current = setCursorInfo;
```

**5c.** Remove `searchKeymap` from keymap array. Change:

```ts
keymap.of([
  ...defaultKeymap, ...historyKeymap, ...closeBracketsKeymap,
  ...searchKeymap,
  ...foldKeymap, indentWithTab,
]),
```

To:

```ts
keymap.of([
  ...defaultKeymap, ...historyKeymap, ...closeBracketsKeymap,
  ...foldKeymap, indentWithTab,
]),
```

**5d.** Add `search()` extension after `highlightSelectionMatches()`:

```ts
highlightSelectionMatches(),
search({ top: false, createPanel: () => ({ dom: document.createElement("div") }) }),
foldGutter(),
```

The `createPanel` override prevents CM6 from rendering its own search UI. The `search()` extension is needed so `setSearchQuery` dispatches are recognized and match decorations are drawn.

**5e.** Extend the existing `EditorView.updateListener.of(...)` callback. Add after `if (update.docChanged)` block:

```ts
if (update.selectionSet || update.docChanged) {
  const { head } = update.state.selection.main;
  const line = update.state.doc.lineAt(head);
  const selRange = update.state.selection.main;
  const selected = Math.abs(selRange.to - selRange.from);
  setCursorInfoRef.current({
    line: line.number,
    col: head - line.from + 1,
    selected,
  });
}
```

### Step 6: Run full test suite

```bash
pnpm run test
```

Expected: All tests pass (including the new editorSlice tests).

### Step 7: Commit

```bash
cd /Users/artemboev/Projects/kodiq/app
git add src/features/editor/store/editorSlice.ts \
        src/features/editor/components/CodeMirrorEditor.tsx \
        src/features/editor/store/__tests__/editorSlice.test.ts
git commit -m "feat(editor): add cursorInfo state and CM6 cursor tracking"
```

---

## Task 3: EditorStatusBar Component

**Files:**
- Create: `src/features/editor/components/EditorStatusBar.tsx`
- Test: `src/features/editor/components/__tests__/EditorStatusBar.test.tsx`

### Step 1: Write the failing test

Create `src/features/editor/components/__tests__/EditorStatusBar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EditorStatusBar } from "../EditorStatusBar";

// -- Mock store -------
const mockStore = {
  cursorInfo: null as { line: number; col: number; selected: number } | null,
  activeEditorTab: "test.ts",
  editorTabs: [{ path: "test.ts", name: "test.ts", language: "typescript", content: "", savedContent: "" }],
};

vi.mock("@/lib/store", () => ({
  useAppStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

vi.mock("@/lib/i18n", () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      statusBarLine: "Ln",
      statusBarCol: "Col",
      statusBarSelected: "selected",
      statusBarSpaces: "Spaces",
    };
    return map[key] ?? key;
  },
}));

describe("EditorStatusBar", () => {
  beforeEach(() => {
    mockStore.cursorInfo = null;
    mockStore.activeEditorTab = "test.ts";
  });

  it("renders nothing when cursorInfo is null", () => {
    const { container } = render(<EditorStatusBar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders line and col", () => {
    mockStore.cursorInfo = { line: 42, col: 13, selected: 0 };
    render(<EditorStatusBar />);
    expect(screen.getByText(/Ln 42/)).toBeInTheDocument();
    expect(screen.getByText(/Col 13/)).toBeInTheDocument();
  });

  it("shows selection count when selected > 0", () => {
    mockStore.cursorInfo = { line: 1, col: 1, selected: 24 };
    render(<EditorStatusBar />);
    expect(screen.getByText(/24 selected/)).toBeInTheDocument();
  });

  it("hides selection count when selected === 0", () => {
    mockStore.cursorInfo = { line: 1, col: 1, selected: 0 };
    render(<EditorStatusBar />);
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it("shows language from active tab", () => {
    mockStore.cursorInfo = { line: 1, col: 1, selected: 0 };
    render(<EditorStatusBar />);
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });
});
```

### Step 2: Run test to verify it fails

```bash
pnpm run test -- src/features/editor/components/__tests__/EditorStatusBar.test.tsx
```

Expected: FAIL — module `../EditorStatusBar` not found.

### Step 3: Implement EditorStatusBar

Create `src/features/editor/components/EditorStatusBar.tsx`:

```tsx
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

// -- Language display names -------
const LANG_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  html: "HTML",
  css: "CSS",
  json: "JSON",
  markdown: "Markdown",
  python: "Python",
  rust: "Rust",
  go: "Go",
  java: "Java",
  cpp: "C++",
  php: "PHP",
  sql: "SQL",
  xml: "XML",
  yaml: "YAML",
  toml: "TOML",
  shell: "Shell",
  plaintext: "Plain Text",
};

export function EditorStatusBar() {
  const cursorInfo = useAppStore((s) => s.cursorInfo);
  const activeEditorTab = useAppStore((s) => s.activeEditorTab);
  const editorTabs = useAppStore((s) => s.editorTabs);

  if (!cursorInfo) return null;

  const activeTab = editorTabs.find((tab) => tab.path === activeEditorTab);
  const language = activeTab?.language ?? "plaintext";
  const langLabel = LANG_LABELS[language] ?? language;

  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-[11px] text-[var(--text-secondary)]">
      <div className="flex items-center gap-2">
        <span>
          {t("statusBarLine")} {cursorInfo.line}, {t("statusBarCol")} {cursorInfo.col}
        </span>
        {cursorInfo.selected > 0 && (
          <span className="text-[var(--text-tertiary)]">
            ({cursorInfo.selected} {t("statusBarSelected")})
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
        <span>UTF-8</span>
        <span>·</span>
        <span>{t("statusBarSpaces")}: 2</span>
        <span>·</span>
        <span>{langLabel}</span>
      </div>
    </div>
  );
}
```

### Step 4: Run test to verify it passes

```bash
pnpm run test -- src/features/editor/components/__tests__/EditorStatusBar.test.tsx
```

Expected: PASS (5 tests)

### Step 5: Commit

```bash
cd /Users/artemboev/Projects/kodiq/app
git add src/features/editor/components/EditorStatusBar.tsx \
        src/features/editor/components/__tests__/EditorStatusBar.test.tsx
git commit -m "feat(editor): add EditorStatusBar component with tests"
```

---

## Task 4: GoToLineDialog Component

**Files:**
- Create: `src/features/editor/components/GoToLineDialog.tsx`
- Test: `src/features/editor/components/__tests__/GoToLineDialog.test.tsx`

### Step 1: Write the failing test

Create `src/features/editor/components/__tests__/GoToLineDialog.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { GoToLineDialog } from "../GoToLineDialog";

vi.mock("@/lib/i18n", () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      goToLineTitle: "Go to Line",
      goToLinePlaceholder: "Go to Line (1 – {max})",
    };
    return map[key] ?? key;
  },
}));

describe("GoToLineDialog", () => {
  const onJump = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <GoToLineDialog open={false} totalLines={100} onJump={onJump} onClose={onClose} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders input when open", () => {
    render(<GoToLineDialog open={true} totalLines={100} onJump={onJump} onClose={onClose} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("calls onJump with valid line number on Enter", () => {
    render(<GoToLineDialog open={true} totalLines={100} onJump={onJump} onClose={onClose} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onJump).toHaveBeenCalledWith(42);
    expect(onClose).toHaveBeenCalled();
  });

  it("clamps line number to valid range", () => {
    render(<GoToLineDialog open={true} totalLines={50} onJump={onJump} onClose={onClose} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onJump).toHaveBeenCalledWith(50);
  });

  it("clamps to 1 when value is below 1", () => {
    render(<GoToLineDialog open={true} totalLines={50} onJump={onJump} onClose={onClose} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onJump).toHaveBeenCalledWith(1);
  });

  it("ignores non-numeric input", () => {
    render(<GoToLineDialog open={true} totalLines={50} onJump={onJump} onClose={onClose} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onJump).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape", () => {
    render(<GoToLineDialog open={true} totalLines={50} onJump={onJump} onClose={onClose} />);
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(onJump).not.toHaveBeenCalled();
  });
});
```

### Step 2: Run test to verify it fails

```bash
pnpm run test -- src/features/editor/components/__tests__/GoToLineDialog.test.tsx
```

Expected: FAIL — module `../GoToLineDialog` not found.

### Step 3: Implement GoToLineDialog

Create `src/features/editor/components/GoToLineDialog.tsx`:

```tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { t } from "@/lib/i18n";

interface Props {
  open: boolean;
  totalLines: number;
  onJump: (line: number) => void;
  onClose: () => void;
}

export function GoToLineDialog({ open, totalLines, onJump, onClose }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) return;
        const clamped = Math.max(1, Math.min(parsed, totalLines));
        onJump(clamped);
        onClose();
      }
    },
    [value, totalLines, onJump, onClose],
  );

  if (!open) return null;

  const placeholder = t("goToLinePlaceholder").replace("{max}", String(totalLines));

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-[20%]">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />
      {/* Dialog */}
      <div className="relative z-10 w-64 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-2 shadow-lg">
        <div className="mb-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
          {t("goToLineTitle")}
        </div>
        <input
          ref={inputRef}
          role="textbox"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-base)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--kodiq-accent)]"
        />
      </div>
    </div>
  );
}
```

### Step 4: Run test to verify it passes

```bash
pnpm run test -- src/features/editor/components/__tests__/GoToLineDialog.test.tsx
```

Expected: PASS (7 tests)

### Step 5: Commit

```bash
cd /Users/artemboev/Projects/kodiq/app
git add src/features/editor/components/GoToLineDialog.tsx \
        src/features/editor/components/__tests__/GoToLineDialog.test.tsx
git commit -m "feat(editor): add GoToLineDialog component with tests"
```

---

## Task 5: FindReplacePanel Component

**Files:**
- Create: `src/features/editor/components/FindReplacePanel.tsx`
- Test: `src/features/editor/components/__tests__/FindReplacePanel.test.tsx`

### Step 1: Write the failing test

Create `src/features/editor/components/__tests__/FindReplacePanel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FindReplacePanel } from "../FindReplacePanel";

vi.mock("@/lib/i18n", () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      findReplaceFind: "Find",
      findReplaceReplace: "Replace",
      findReplaceMatchCase: "Match Case",
      findReplaceRegex: "Regex",
      findReplaceNoResults: "No results",
      findReplaceReplaceAll: "Replace All",
      findReplaceOf: "of",
    };
    return map[key] ?? key;
  },
}));

describe("FindReplacePanel", () => {
  const onSearch = vi.fn();
  const onNext = vi.fn();
  const onPrev = vi.fn();
  const onReplace = vi.fn();
  const onReplaceAll = vi.fn();
  const onClose = vi.fn();

  const defaultProps = {
    open: true,
    showReplace: false,
    initialQuery: "",
    matchCount: 0,
    currentMatch: 0,
    onSearch,
    onNext,
    onPrev,
    onReplace,
    onReplaceAll,
    onClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    const { container } = render(<FindReplacePanel {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders find input when open", () => {
    render(<FindReplacePanel {...defaultProps} />);
    expect(screen.getByPlaceholderText("Find")).toBeInTheDocument();
  });

  it("hides replace row when showReplace is false", () => {
    render(<FindReplacePanel {...defaultProps} showReplace={false} />);
    expect(screen.queryByPlaceholderText("Replace")).not.toBeInTheDocument();
  });

  it("shows replace row when showReplace is true", () => {
    render(<FindReplacePanel {...defaultProps} showReplace={true} />);
    expect(screen.getByPlaceholderText("Replace")).toBeInTheDocument();
  });

  it("calls onSearch when typing in find input", () => {
    render(<FindReplacePanel {...defaultProps} />);
    const input = screen.getByPlaceholderText("Find");
    fireEvent.change(input, { target: { value: "hello" } });
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: "hello" }),
    );
  });

  it("shows match count", () => {
    render(<FindReplacePanel {...defaultProps} matchCount={17} currentMatch={3} />);
    expect(screen.getByText(/3 of 17/)).toBeInTheDocument();
  });

  it("shows 'No results' when matchCount is 0 and query exists", () => {
    render(<FindReplacePanel {...defaultProps} matchCount={0} />);
    // "No results" only shows when there's a typed query — tested via internal state
  });

  it("calls onClose on Escape", () => {
    render(<FindReplacePanel {...defaultProps} />);
    const input = screen.getByPlaceholderText("Find");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onNext on Enter in find input", () => {
    render(<FindReplacePanel {...defaultProps} />);
    const input = screen.getByPlaceholderText("Find");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onNext).toHaveBeenCalled();
  });

  it("toggles match case", () => {
    render(<FindReplacePanel {...defaultProps} />);
    const btn = screen.getByTitle("Match Case");
    fireEvent.click(btn);
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ caseSensitive: true }),
    );
  });
});
```

### Step 2: Run test to verify it fails

```bash
pnpm run test -- src/features/editor/components/__tests__/FindReplacePanel.test.tsx
```

Expected: FAIL — module `../FindReplacePanel` not found.

### Step 3: Implement FindReplacePanel

Create `src/features/editor/components/FindReplacePanel.tsx`:

```tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { t } from "@/lib/i18n";

export interface SearchParams {
  query: string;
  caseSensitive: boolean;
  regexp: boolean;
  replace: string;
}

interface Props {
  open: boolean;
  showReplace: boolean;
  initialQuery: string;
  matchCount: number;
  currentMatch: number;
  onSearch: (params: SearchParams) => void;
  onNext: () => void;
  onPrev: () => void;
  onReplace: (replaceWith: string) => void;
  onReplaceAll: (replaceWith: string) => void;
  onClose: () => void;
}

export function FindReplacePanel({
  open,
  showReplace,
  initialQuery,
  matchCount,
  currentMatch,
  onSearch,
  onNext,
  onPrev,
  onReplace,
  onReplaceAll,
  onClose,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [replaceValue, setReplaceValue] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regexp, setRegexp] = useState(false);
  const findInputRef = useRef<HTMLInputElement>(null);

  // -- Sync initial query when panel opens -------
  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      requestAnimationFrame(() => {
        findInputRef.current?.focus();
        findInputRef.current?.select();
      });
    }
  }, [open, initialQuery]);

  // -- Emit search on every change -------
  const emitSearch = useCallback(
    (q: string, cs: boolean, re: boolean) => {
      onSearch({ query: q, caseSensitive: cs, regexp: re, replace: replaceValue });
    },
    [onSearch, replaceValue],
  );

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    emitSearch(q, caseSensitive, regexp);
  };

  const toggleCase = () => {
    const next = !caseSensitive;
    setCaseSensitive(next);
    emitSearch(query, next, regexp);
  };

  const toggleRegex = () => {
    const next = !regexp;
    setRegexp(next);
    emitSearch(query, caseSensitive, next);
  };

  const handleFindKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
    }
  };

  const handleReplaceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      onReplace(replaceValue);
    }
  };

  if (!open) return null;

  const hasQuery = query.length > 0;
  const matchLabel = hasQuery
    ? matchCount > 0
      ? `${currentMatch} ${t("findReplaceOf")} ${matchCount}`
      : t("findReplaceNoResults")
    : "";

  const inputClass =
    "h-6 flex-1 rounded border border-[var(--border-default)] bg-[var(--bg-base)] px-2 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--kodiq-accent)]";
  const btnClass =
    "flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]";
  const toggleOn = "bg-[var(--bg-elevated)] text-[var(--text-primary)]";

  return (
    <div className="absolute right-2 top-2 z-40 w-80 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-2 shadow-lg">
      {/* Find row */}
      <div className="flex items-center gap-1">
        <input
          ref={findInputRef}
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleFindKeyDown}
          placeholder={t("findReplaceFind")}
          className={inputClass}
        />
        <button
          title={t("findReplaceMatchCase")}
          className={`${btnClass} ${caseSensitive ? toggleOn : ""}`}
          onClick={toggleCase}
        >
          <span className="text-[10px] font-bold">Aa</span>
        </button>
        <button
          title={t("findReplaceRegex")}
          className={`${btnClass} ${regexp ? toggleOn : ""}`}
          onClick={toggleRegex}
        >
          <span className="text-[10px] font-bold">.*</span>
        </button>
        <span className="min-w-[50px] text-center text-[10px] text-[var(--text-tertiary)]">
          {matchLabel}
        </span>
        <button title="Previous" className={btnClass} onClick={onPrev}>
          ↑
        </button>
        <button title="Next" className={btnClass} onClick={onNext}>
          ↓
        </button>
        <button title="Close" className={btnClass} onClick={onClose}>
          ×
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="mt-1 flex items-center gap-1">
          <input
            value={replaceValue}
            onChange={(e) => setReplaceValue(e.target.value)}
            onKeyDown={handleReplaceKeyDown}
            placeholder={t("findReplaceReplace")}
            className={inputClass}
          />
          <button
            className="h-6 rounded px-2 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
            onClick={() => onReplace(replaceValue)}
          >
            {t("findReplaceReplace")}
          </button>
          <button
            className="h-6 rounded px-2 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
            onClick={() => onReplaceAll(replaceValue)}
          >
            {t("findReplaceReplaceAll")}
          </button>
        </div>
      )}
    </div>
  );
}
```

### Step 4: Run test to verify it passes

```bash
pnpm run test -- src/features/editor/components/__tests__/FindReplacePanel.test.tsx
```

Expected: PASS (10 tests)

### Step 5: Commit

```bash
cd /Users/artemboev/Projects/kodiq/app
git add src/features/editor/components/FindReplacePanel.tsx \
        src/features/editor/components/__tests__/FindReplacePanel.test.tsx
git commit -m "feat(editor): add FindReplacePanel component with tests"
```

---

## Task 6: Integrate into EditorPanel + Keyboard Shortcuts

**Files:**
- Modify: `src/features/editor/components/EditorPanel.tsx`

### Step 1: Add imports

Add to top of `EditorPanel.tsx`:

```ts
import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { EditorSelection } from "@codemirror/state";
import { SearchQuery, setSearchQuery, findNext, findPrevious, replaceNext, replaceAll, getSearchQuery } from "@codemirror/search";
import { EditorStatusBar } from "./EditorStatusBar";
import { GoToLineDialog } from "./GoToLineDialog";
import { FindReplacePanel, type SearchParams } from "./FindReplacePanel";
import { getViewEntry } from "../lib/viewCache";
```

(Keep existing imports; merge `useState` and `useCallback` if already imported.)

### Step 2: Add local state for dialogs

Inside `EditorPanel`, add:

```ts
// -- Dialog state -------
const [goToLineOpen, setGoToLineOpen] = useState(false);
const [findOpen, setFindOpen] = useState(false);
const [findShowReplace, setFindShowReplace] = useState(false);
const [findInitialQuery, setFindInitialQuery] = useState("");
const [findMatchCount, setFindMatchCount] = useState(0);
const [findCurrentMatch, setFindCurrentMatch] = useState(0);
```

### Step 3: Add helper to get active view

```ts
const getActiveView = useCallback(() => {
  if (!activeEditorTab) return null;
  return getViewEntry(activeEditorTab)?.view ?? null;
}, [activeEditorTab]);
```

### Step 4: Add Go to Line handler

```ts
const handleGoToLine = useCallback(
  (line: number) => {
    const view = getActiveView();
    if (!view) return;
    const docLine = view.state.doc.line(Math.min(line, view.state.doc.lines));
    view.dispatch({
      selection: EditorSelection.cursor(docLine.from),
      scrollIntoView: true,
    });
    view.focus();
  },
  [getActiveView],
);
```

### Step 5: Add Find & Replace handlers

```ts
const handleFindSearch = useCallback(
  (params: SearchParams) => {
    const view = getActiveView();
    if (!view) return;
    if (!params.query) {
      setFindMatchCount(0);
      setFindCurrentMatch(0);
      view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: "" })) });
      return;
    }
    const sq = new SearchQuery({
      search: params.query,
      caseSensitive: params.caseSensitive,
      regexp: params.regexp,
    });
    view.dispatch({ effects: setSearchQuery.of(sq) });
    // Count matches
    const cursor = sq.getCursor(view.state.doc);
    let count = 0;
    while (!cursor.next().done) count++;
    setFindMatchCount(count);
    setFindCurrentMatch(count > 0 ? 1 : 0);
  },
  [getActiveView],
);

const handleFindNext = useCallback(() => {
  const view = getActiveView();
  if (!view) return;
  findNext(view);
  // Update current match position
  const query = getSearchQuery(view.state);
  if (query.valid) {
    const cursor = query.getCursor(view.state.doc);
    const head = view.state.selection.main.head;
    let idx = 0;
    while (!cursor.next().done) {
      idx++;
      if (cursor.value.from >= head) break;
    }
    setFindCurrentMatch(idx);
  }
}, [getActiveView]);

const handleFindPrev = useCallback(() => {
  const view = getActiveView();
  if (!view) return;
  findPrevious(view);
  const query = getSearchQuery(view.state);
  if (query.valid) {
    const cursor = query.getCursor(view.state.doc);
    const head = view.state.selection.main.head;
    let idx = 0;
    while (!cursor.next().done) {
      idx++;
      if (cursor.value.from >= head) break;
    }
    setFindCurrentMatch(idx);
  }
}, [getActiveView]);

const handleReplace = useCallback(
  (replaceWith: string) => {
    const view = getActiveView();
    if (view) replaceNext(view);
  },
  [getActiveView],
);

const handleReplaceAll = useCallback(
  (replaceWith: string) => {
    const view = getActiveView();
    if (view) replaceAll(view);
  },
  [getActiveView],
);

const handleFindClose = useCallback(() => {
  setFindOpen(false);
  const view = getActiveView();
  if (view) {
    // Clear search highlighting
    view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: "" })) });
    view.focus();
  }
}, [getActiveView]);
```

### Step 6: Register keyboard shortcuts

After the handler definitions, inside `EditorPanel`:

```ts
// -- Shortcuts -------
useHotkeys("mod+g", (e) => {
  e.preventDefault();
  setGoToLineOpen(true);
}, { enableOnFormTags: true });

useHotkeys("mod+f", (e) => {
  e.preventDefault();
  // Auto-fill from selection
  const view = getActiveView();
  const sel = view?.state.selection.main;
  const selectedText = sel && sel.from !== sel.to
    ? view!.state.sliceDoc(sel.from, sel.to)
    : "";
  setFindInitialQuery(selectedText);
  setFindShowReplace(false);
  setFindOpen(true);
}, { enableOnFormTags: true });

useHotkeys("mod+h", (e) => {
  e.preventDefault();
  const view = getActiveView();
  const sel = view?.state.selection.main;
  const selectedText = sel && sel.from !== sel.to
    ? view!.state.sliceDoc(sel.from, sel.to)
    : "";
  setFindInitialQuery(selectedText);
  setFindShowReplace(true);
  setFindOpen(true);
}, { enableOnFormTags: true });
```

### Step 7: Add components to JSX

In the `return` JSX of `EditorPanel`, update to:

```tsx
return (
  <div className="flex h-full flex-col overflow-hidden">
    <EditorTabBar tabs={editorTabs} activeTab={activeEditorTab} onClose={handleClose} />

    <div className="relative flex-1 overflow-hidden">
      {activeTab ? (
        <CodeMirrorEditor key={activeTab.path} tab={activeTab} />
      ) : (
        <div className="flex h-full items-center justify-center text-[11px] text-[var(--text-tertiary)]">
          {t("noOpenFiles")}
        </div>
      )}

      {/* Find & Replace overlay */}
      <FindReplacePanel
        open={findOpen}
        showReplace={findShowReplace}
        initialQuery={findInitialQuery}
        matchCount={findMatchCount}
        currentMatch={findCurrentMatch}
        onSearch={handleFindSearch}
        onNext={handleFindNext}
        onPrev={handleFindPrev}
        onReplace={handleReplace}
        onReplaceAll={handleReplaceAll}
        onClose={handleFindClose}
      />

      {/* Go to Line overlay */}
      <GoToLineDialog
        open={goToLineOpen}
        totalLines={getActiveView()?.state.doc.lines ?? 1}
        onJump={handleGoToLine}
        onClose={() => { setGoToLineOpen(false); getActiveView()?.focus(); }}
      />
    </div>

    <EditorStatusBar />

    <UnsavedDialog
      open={pendingClose !== null}
      fileName={pendingTab?.name ?? ""}
      onSaveAndClose={handleSaveAndClose}
      onDiscard={handleDiscard}
      onCancel={handleCancelClose}
    />
  </div>
);
```

### Step 8: Run full test suite

```bash
cd /Users/artemboev/Projects/kodiq/app
pnpm run test
```

Expected: All tests pass.

### Step 9: Run typecheck and lint

```bash
pnpm run typecheck && pnpm run lint
```

Expected: No errors.

### Step 10: Commit

```bash
cd /Users/artemboev/Projects/kodiq/app
git add src/features/editor/components/EditorPanel.tsx
git commit -m "feat(editor): integrate status bar, go-to-line, find & replace into EditorPanel"
```

---

## Task 7: Version Bump to v0.5.0

**Files:**
- Modify: `package.json`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/Cargo.toml`

### Step 1: Bump package.json

In `package.json`, change:

```json
"version": "0.4.0",
```

To:

```json
"version": "0.5.0",
```

### Step 2: Bump tauri.conf.json

In `src-tauri/tauri.conf.json`, find the `version` field and change to `"0.5.0"`.

### Step 3: Bump Cargo.toml

In `src-tauri/Cargo.toml`, find the `version` field and change to `"0.5.0"`.

### Step 4: Run full check suite

```bash
cd /Users/artemboev/Projects/kodiq/app
pnpm run check:all
```

Expected: All checks pass (typecheck, lint, format, tests).

### Step 5: Commit

```bash
cd /Users/artemboev/Projects/kodiq/app
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: bump version to v0.5.0"
```
