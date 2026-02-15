// ── Editor Slice ─────────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";

export interface EditorSlice {
  // State
  openFilePath: string | null;
  openFileContent: string | null;

  // Actions
  setOpenFile: (path: string | null, content?: string | null) => void;
}

export const createEditorSlice: StateCreator<EditorSlice, [], [], EditorSlice> = (set) => ({
  openFilePath: null,
  openFileContent: null,
  setOpenFile: (path, content = null) => set({ openFilePath: path, openFileContent: content }),
});
