// ── Activity Slice ───────────────────────────────────────────────────────────
// Tracks session activity: commands run, files changed (via git diff).

import type { StateCreator } from "zustand";

export interface ActivityEntry {
  id: string;
  type: "command" | "file_change";
  label: string;
  detail?: string;
  timestamp: number;
}

export interface ActivitySlice {
  activityLog: ActivityEntry[];
  sessionStartFiles: string[];

  addActivity: (entry: Omit<ActivityEntry, "id" | "timestamp">) => void;
  clearActivity: () => void;
  setSessionStartFiles: (files: string[]) => void;
}

let activityCounter = 0;

export const createActivitySlice: StateCreator<ActivitySlice, [], [], ActivitySlice> = (set) => ({
  activityLog: [],
  sessionStartFiles: [],

  addActivity: (entry) =>
    set((s) => ({
      activityLog: [
        ...s.activityLog,
        {
          ...entry,
          id: `act-${++activityCounter}`,
          timestamp: Date.now(),
        },
      ],
    })),

  clearActivity: () => set({ activityLog: [], sessionStartFiles: [] }),

  setSessionStartFiles: (sessionStartFiles) => set({ sessionStartFiles }),
});
