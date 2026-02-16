// ── Preview Slice ────────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";
import type { Viewport } from "@shared/lib/types";
import { db } from "@shared/lib/tauri";

export interface PreviewSlice {
  // State
  previewUrl: string | null;
  previewOpen: boolean;
  viewport: Viewport;

  // Actions
  setPreviewUrl: (url: string | null) => void;
  setPreviewOpen: (open: boolean) => void;
  togglePreview: () => void;
  setViewport: (v: Viewport) => void;
}

export const createPreviewSlice: StateCreator<PreviewSlice, [], [], PreviewSlice> = (set) => ({
  previewUrl: null,
  previewOpen: true, // Default; hydrated from DB via loadSettingsFromDB
  viewport: "desktop",

  setPreviewUrl: (previewUrl) => set({ previewUrl }),

  setPreviewOpen: (previewOpen) => {
    db.settings
      .set("previewOpen", String(previewOpen))
      .catch((e) => console.error("[DB] setting:", e));
    set({ previewOpen });
  },

  togglePreview: () =>
    set((s) => {
      const next = !s.previewOpen;
      db.settings.set("previewOpen", String(next)).catch((e) => console.error("[DB] setting:", e));
      return { previewOpen: next };
    }),

  setViewport: (viewport) => set({ viewport }),
});
