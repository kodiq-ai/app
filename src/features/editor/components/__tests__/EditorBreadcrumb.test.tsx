import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EditorBreadcrumb } from "../EditorBreadcrumb";

// -- Mock store -------
const mockStore = {
  activeEditorTab: null as string | null,
  editorTabs: [] as { path: string; name: string }[],
  projectPath: "/home/user/my-project",
};

vi.mock("@/lib/store", () => ({
  useAppStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

describe("EditorBreadcrumb", () => {
  beforeEach(() => {
    mockStore.activeEditorTab = null;
    mockStore.editorTabs = [];
    mockStore.projectPath = "/home/user/my-project";
  });

  it("returns null when no active tab", () => {
    const { container } = render(<EditorBreadcrumb />);
    expect(container.firstChild).toBeNull();
  });

  it("renders path segments for active tab", () => {
    mockStore.editorTabs = [
      { path: "/home/user/my-project/src/components/App.tsx", name: "App.tsx" },
    ];
    mockStore.activeEditorTab = "/home/user/my-project/src/components/App.tsx";

    render(<EditorBreadcrumb />);
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("components")).toBeInTheDocument();
    expect(screen.getByText("App.tsx")).toBeInTheDocument();
  });

  it("highlights only the last segment (filename)", () => {
    mockStore.editorTabs = [{ path: "/home/user/my-project/src/index.ts", name: "index.ts" }];
    mockStore.activeEditorTab = "/home/user/my-project/src/index.ts";

    render(<EditorBreadcrumb />);

    const src = screen.getByText("src");
    const file = screen.getByText("index.ts");

    expect(src.className).toContain("text-[var(--text-tertiary)]");
    expect(file.className).toContain("text-[var(--text-primary)]");
  });

  it("falls back to name when projectPath is null", () => {
    mockStore.projectPath = null as unknown as string;
    mockStore.editorTabs = [{ path: "/some/deep/path/utils.ts", name: "utils.ts" }];
    mockStore.activeEditorTab = "/some/deep/path/utils.ts";

    render(<EditorBreadcrumb />);
    expect(screen.getByText("utils.ts")).toBeInTheDocument();
  });

  it("renders separator chevrons between segments", () => {
    mockStore.editorTabs = [{ path: "/home/user/my-project/a/b/c.ts", name: "c.ts" }];
    mockStore.activeEditorTab = "/home/user/my-project/a/b/c.ts";

    const { container } = render(<EditorBreadcrumb />);
    // 3 segments = 2 chevron separators
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(2);
  });
});
