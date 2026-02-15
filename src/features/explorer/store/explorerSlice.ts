// ── Explorer Slice ───────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";
import type { FileEntry, SidebarTab } from "@shared/lib/types";

export interface ExplorerSlice {
  // State
  fileTree: FileEntry[];
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;

  // Actions
  setFileTree: (tree: FileEntry[]) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
}

export const createExplorerSlice: StateCreator<ExplorerSlice, [], [], ExplorerSlice> = (set) => ({
  fileTree: [],
  sidebarOpen: true,
  sidebarTab: "files",

  setFileTree: (fileTree) => set({ fileTree }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
});
