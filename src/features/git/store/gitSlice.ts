// ── Git Slice ────────────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";
import type { GitInfo, ProjectStats } from "@shared/lib/types";

export interface GitSlice {
  // State
  gitInfo: GitInfo | null;
  projectStats: ProjectStats | null;

  // Actions
  setGitInfo: (info: GitInfo | null) => void;
  setProjectStats: (stats: ProjectStats | null) => void;
}

export const createGitSlice: StateCreator<GitSlice, [], [], GitSlice> = (set) => ({
  gitInfo: null,
  projectStats: null,

  setGitInfo: (gitInfo) => set({ gitInfo }),
  setProjectStats: (projectStats) => set({ projectStats }),
});
