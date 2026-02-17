// ── Git Slice ────────────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";
import type { GitInfo, ProjectStats } from "@shared/lib/types";

export interface GitSlice {
  // State
  gitInfo: GitInfo | null;
  projectStats: ProjectStats | null;
  commitMessage: string;
  isCommitting: boolean;

  // Actions
  setGitInfo: (info: GitInfo | null) => void;
  setProjectStats: (stats: ProjectStats | null) => void;
  setCommitMessage: (msg: string) => void;
  setIsCommitting: (val: boolean) => void;
}

export const createGitSlice: StateCreator<GitSlice, [], [], GitSlice> = (set) => ({
  gitInfo: null,
  projectStats: null,
  commitMessage: "",
  isCommitting: false,

  setGitInfo: (gitInfo) => set({ gitInfo }),
  setProjectStats: (projectStats) => set({ projectStats }),
  setCommitMessage: (commitMessage) => set({ commitMessage }),
  setIsCommitting: (isCommitting) => set({ isCommitting }),
});
