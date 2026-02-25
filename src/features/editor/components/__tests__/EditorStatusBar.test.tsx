import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EditorStatusBar } from "../EditorStatusBar";

// -- Mock store -------
const mockStore = {
  cursorInfo: null as { line: number; col: number; selected: number } | null,
  activeEditorTab: "test.ts",
  editorTabs: [
    { path: "test.ts", name: "test.ts", language: "typescript", content: "", savedContent: "" },
  ],
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
