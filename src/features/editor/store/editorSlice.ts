// ── Editor Slice ─────────────────────────────────────────────────────────────
// Multi-tab editor state with dirty tracking.
// Backward-compatible: setOpenFile, openFilePath, openFileContent still work.

import type { StateCreator } from "zustand";
import { trackEvent } from "@shared/lib/analytics";

// -- Types -------
export interface CursorInfo {
  line: number;
  col: number;
  selected: number;
}

export interface EditorTab {
  path: string; // absolute file path (unique key)
  name: string; // filename extracted from path
  savedContent: string; // content on disk at open/last save
  content: string; // live buffer content (synced from CM6)
  language: string; // file extension (for language loading)
  scrollPos?: { top: number; left: number };
}

export interface EditorSlice {
  // State
  editorTabs: EditorTab[];
  activeEditorTab: string | null;
  cursorInfo: CursorInfo | null;

  // Actions
  openFile: (path: string, content: string) => void;
  closeEditorTab: (path: string) => boolean; // false if dirty (caller handles confirm)
  forceCloseEditorTab: (path: string) => void;
  setActiveEditorTab: (path: string) => void;
  updateTabContent: (path: string, content: string) => void;
  markTabSaved: (path: string, content: string) => void;
  updateTabScroll: (path: string, pos: { top: number; left: number }) => void;
  closeAllEditorTabs: () => void;
  reorderEditorTabs: (fromIndex: number, toIndex: number) => void;
  setCursorInfo: (info: CursorInfo | null) => void;

  // Backward compat (delegates to openFile)
  setOpenFile: (path: string | null, content?: string | null) => void;
  openFilePath: string | null;
  openFileContent: string | null;
}

// -- Helpers -------
function extractName(path: string): string {
  return path.split("/").pop() ?? path;
}

function extractLanguage(path: string): string {
  const name = extractName(path);
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1) : "";
}

// -- Slice -------
export const createEditorSlice: StateCreator<EditorSlice, [], [], EditorSlice> = (set, get) => ({
  // State
  editorTabs: [],
  activeEditorTab: null,
  cursorInfo: null,

  // Backward compat getters (computed from tabs)
  openFilePath: null,
  openFileContent: null,

  openFile: (path, content) => {
    const { editorTabs } = get();
    const existing = editorTabs.find((t) => t.path === path);

    if (existing) {
      // Focus existing tab
      set({
        activeEditorTab: path,
        openFilePath: path,
        openFileContent: existing.content,
      });
    } else {
      // Create new tab
      const tab: EditorTab = {
        path,
        name: extractName(path),
        savedContent: content,
        content,
        language: extractLanguage(path),
      };
      set({
        editorTabs: [...editorTabs, tab],
        activeEditorTab: path,
        openFilePath: path,
        openFileContent: content,
      });
      trackEvent("file_opened", { language: tab.language });
      if (editorTabs.length === 0) {
        trackEvent("feature_used", { feature: "editor" });
      }
    }
  },

  closeEditorTab: (path) => {
    const { editorTabs } = get();
    const tab = editorTabs.find((t) => t.path === path);
    if (!tab) return true;
    if (tab.content !== tab.savedContent) return false; // dirty — caller handles confirm

    get().forceCloseEditorTab(path);
    return true;
  },

  forceCloseEditorTab: (path) => {
    const { editorTabs, activeEditorTab } = get();
    const idx = editorTabs.findIndex((t) => t.path === path);
    if (idx === -1) return;

    const newTabs = editorTabs.filter((t) => t.path !== path);
    let newActive = activeEditorTab;

    if (activeEditorTab === path) {
      // Activate adjacent tab (prefer right, then left)
      if (newTabs.length === 0) {
        newActive = null;
      } else if (idx < newTabs.length) {
        newActive = newTabs[idx]?.path ?? null;
      } else {
        newActive = newTabs[newTabs.length - 1]?.path ?? null;
      }
    }

    const activeTab = newTabs.find((t) => t.path === newActive);
    set({
      editorTabs: newTabs,
      activeEditorTab: newActive,
      openFilePath: newActive,
      openFileContent: activeTab?.content ?? null,
    });
  },

  setActiveEditorTab: (path) => {
    const tab = get().editorTabs.find((t) => t.path === path);
    if (!tab) return;
    set({
      activeEditorTab: path,
      openFilePath: path,
      openFileContent: tab.content,
    });
  },

  updateTabContent: (path, content) => {
    set({
      editorTabs: get().editorTabs.map((t) => (t.path === path ? { ...t, content } : t)),
      // Sync compat fields if this is the active tab
      ...(get().activeEditorTab === path ? { openFileContent: content } : {}),
    });
  },

  markTabSaved: (path, content) => {
    set({
      editorTabs: get().editorTabs.map((t) =>
        t.path === path ? { ...t, savedContent: content, content } : t,
      ),
    });
  },

  updateTabScroll: (path, pos) => {
    set({
      editorTabs: get().editorTabs.map((t) => (t.path === path ? { ...t, scrollPos: pos } : t)),
    });
  },

  setCursorInfo: (info) => set({ cursorInfo: info }),

  closeAllEditorTabs: () => {
    set({
      editorTabs: [],
      activeEditorTab: null,
      openFilePath: null,
      openFileContent: null,
    });
  },

  reorderEditorTabs: (fromIndex, toIndex) =>
    set((s) => {
      const next = [...s.editorTabs];
      const [moved] = next.splice(fromIndex, 1);
      if (moved) {
        next.splice(toIndex, 0, moved);
      }
      return { editorTabs: next };
    }),

  // Backward compat shim — delegates to openFile or does nothing on null
  setOpenFile: (path, content = null) => {
    if (path && content) {
      get().openFile(path, content);
    }
    // setOpenFile(null) is a no-op — tabs persist until explicitly closed
  },
});
