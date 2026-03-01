// ── Feedback Slice ───────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";

export interface FeedbackSlice {
  bugReportOpen: boolean;
  setBugReportOpen: (open: boolean) => void;
}

export const createFeedbackSlice: StateCreator<FeedbackSlice, [], [], FeedbackSlice> = (set) => ({
  bugReportOpen: false,
  setBugReportOpen: (bugReportOpen) => set({ bugReportOpen }),
});
