import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import { createEditorSlice, type EditorSlice } from "./editorSlice";

function createTestStore() {
  return create<EditorSlice>()((...args) => createEditorSlice(...args));
}

/** Get first tab or throw (safe for tests). */
function firstTab(store: ReturnType<typeof createTestStore>) {
  const tab = store.getState().editorTabs[0];
  if (!tab) throw new Error("Expected at least one tab");
  return tab;
}

describe("editorSlice", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it("starts with empty tabs", () => {
    const state = store.getState();
    expect(state.editorTabs).toEqual([]);
    expect(state.activeEditorTab).toBeNull();
    expect(state.openFilePath).toBeNull();
    expect(state.openFileContent).toBeNull();
  });

  it("openFile creates a new tab and sets it active", () => {
    store.getState().openFile("/src/main.ts", "console.log('hi')");
    const state = store.getState();
    const tab = firstTab(store);
    expect(state.editorTabs).toHaveLength(1);
    expect(tab.path).toBe("/src/main.ts");
    expect(tab.name).toBe("main.ts");
    expect(tab.language).toBe("ts");
    expect(tab.content).toBe("console.log('hi')");
    expect(tab.savedContent).toBe("console.log('hi')");
    expect(state.activeEditorTab).toBe("/src/main.ts");
    // Backward compat
    expect(state.openFilePath).toBe("/src/main.ts");
    expect(state.openFileContent).toBe("console.log('hi')");
  });

  it("openFile focuses existing tab instead of duplicating", () => {
    store.getState().openFile("/src/main.ts", "v1");
    store.getState().openFile("/src/other.ts", "v2");
    store.getState().openFile("/src/main.ts", "v1-updated");
    const state = store.getState();
    expect(state.editorTabs).toHaveLength(2);
    expect(state.activeEditorTab).toBe("/src/main.ts");
  });

  it("detects dirty state from content difference", () => {
    store.getState().openFile("/src/file.ts", "original");
    store.getState().updateTabContent("/src/file.ts", "modified");
    const tab = firstTab(store);
    expect(tab.content).toBe("modified");
    expect(tab.savedContent).toBe("original");
    // Dirty = content !== savedContent
    expect(tab.content !== tab.savedContent).toBe(true);
  });

  it("markTabSaved clears dirty state", () => {
    store.getState().openFile("/src/file.ts", "original");
    store.getState().updateTabContent("/src/file.ts", "modified");
    store.getState().markTabSaved("/src/file.ts", "modified");
    const tab = firstTab(store);
    expect(tab.content).toBe("modified");
    expect(tab.savedContent).toBe("modified");
    expect(tab.content === tab.savedContent).toBe(true);
  });

  it("closeEditorTab returns false when dirty (blocks close)", () => {
    store.getState().openFile("/src/file.ts", "original");
    store.getState().updateTabContent("/src/file.ts", "modified");
    const closed = store.getState().closeEditorTab("/src/file.ts");
    expect(closed).toBe(false);
    expect(store.getState().editorTabs).toHaveLength(1); // still open
  });

  it("closeEditorTab returns true and removes clean tab", () => {
    store.getState().openFile("/src/file.ts", "clean");
    const closed = store.getState().closeEditorTab("/src/file.ts");
    expect(closed).toBe(true);
    expect(store.getState().editorTabs).toHaveLength(0);
  });

  it("forceCloseEditorTab removes dirty tab", () => {
    store.getState().openFile("/src/file.ts", "original");
    store.getState().updateTabContent("/src/file.ts", "dirty");
    store.getState().forceCloseEditorTab("/src/file.ts");
    expect(store.getState().editorTabs).toHaveLength(0);
  });

  it("closing active tab activates adjacent tab", () => {
    store.getState().openFile("/a.ts", "a");
    store.getState().openFile("/b.ts", "b");
    store.getState().openFile("/c.ts", "c");
    // Active is /c.ts, close it -> should activate /b.ts
    store.getState().forceCloseEditorTab("/c.ts");
    expect(store.getState().activeEditorTab).toBe("/b.ts");
  });

  it("closing middle tab activates right neighbor", () => {
    store.getState().openFile("/a.ts", "a");
    store.getState().openFile("/b.ts", "b");
    store.getState().openFile("/c.ts", "c");
    store.getState().setActiveEditorTab("/b.ts");
    store.getState().forceCloseEditorTab("/b.ts");
    expect(store.getState().activeEditorTab).toBe("/c.ts");
  });

  it("closeAllEditorTabs resets everything", () => {
    store.getState().openFile("/a.ts", "a");
    store.getState().openFile("/b.ts", "b");
    store.getState().closeAllEditorTabs();
    const state = store.getState();
    expect(state.editorTabs).toHaveLength(0);
    expect(state.activeEditorTab).toBeNull();
    expect(state.openFilePath).toBeNull();
    expect(state.openFileContent).toBeNull();
  });

  it("setOpenFile backward compat delegates to openFile", () => {
    store.getState().setOpenFile("/src/compat.ts", "data");
    expect(store.getState().editorTabs).toHaveLength(1);
    expect(store.getState().activeEditorTab).toBe("/src/compat.ts");
  });

  it("setOpenFile(null) is a no-op", () => {
    store.getState().openFile("/src/file.ts", "data");
    store.getState().setOpenFile(null);
    expect(store.getState().editorTabs).toHaveLength(1); // tabs persist
  });

  it("updateTabScroll stores scroll position", () => {
    store.getState().openFile("/src/file.ts", "data");
    store.getState().updateTabScroll("/src/file.ts", { top: 100, left: 0 });
    const tab = firstTab(store);
    expect(tab.scrollPos).toEqual({ top: 100, left: 0 });
  });
});
