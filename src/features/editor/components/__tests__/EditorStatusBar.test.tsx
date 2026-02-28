import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EditorStatusBar } from "../EditorStatusBar";

// -- Mock store -------
const mockStore = {
  cursorInfo: null as { line: number; col: number; selected: number } | null,
  activeEditorTab: "test.ts",
  editorTabs: [
    {
      path: "test.ts",
      name: "test.ts",
      language: "typescript",
      content: "hello world",
      savedContent: "",
    },
  ],
  gitInfo: null as { isGit: boolean; branch?: string; changedCount?: number } | null,
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
      statusBarChanges: "changes",
    };
    return map[key] ?? key;
  },
}));

describe("EditorStatusBar", () => {
  beforeEach(() => {
    mockStore.cursorInfo = null;
    mockStore.activeEditorTab = "test.ts";
    mockStore.gitInfo = null;
    mockStore.editorTabs = [
      {
        path: "test.ts",
        name: "test.ts",
        language: "typescript",
        content: "hello world",
        savedContent: "",
      },
    ];
  });

  it("renders even when cursorInfo is null (global bar)", () => {
    const { container } = render(<EditorStatusBar />);
    expect(container.firstChild).not.toBeNull();
  });

  it("shows git branch when gitInfo is available", () => {
    mockStore.gitInfo = { isGit: true, branch: "main", changedCount: 0 };
    render(<EditorStatusBar />);
    expect(screen.getByText("main")).toBeInTheDocument();
  });

  it("shows changes badge when changedCount > 0", () => {
    mockStore.gitInfo = { isGit: true, branch: "feat/test", changedCount: 3 };
    render(<EditorStatusBar />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("hides changes badge when changedCount is 0", () => {
    mockStore.gitInfo = { isGit: true, branch: "main", changedCount: 0 };
    render(<EditorStatusBar />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("hides git info when not a git repo", () => {
    mockStore.gitInfo = { isGit: false };
    render(<EditorStatusBar />);
    expect(screen.queryByText("main")).not.toBeInTheDocument();
  });

  it("renders line and col when editor is open", () => {
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

  it("shows file size when editor is open", () => {
    mockStore.cursorInfo = { line: 1, col: 1, selected: 0 };
    mockStore.editorTabs = [
      {
        path: "test.ts",
        name: "test.ts",
        language: "typescript",
        content: "hello world",
        savedContent: "",
      },
    ];
    render(<EditorStatusBar />);
    expect(screen.getByText("11 B")).toBeInTheDocument();
  });

  it("hides editor-specific info when no cursor", () => {
    mockStore.cursorInfo = null;
    mockStore.gitInfo = { isGit: true, branch: "main" };
    render(<EditorStatusBar />);
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.queryByText("UTF-8")).not.toBeInTheDocument();
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
  });
});
