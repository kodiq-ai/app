// ── Preview Slice ────────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";
import type { Viewport, PreviewBounds } from "@shared/lib/types";
import { db, preview } from "@shared/lib/tauri";

export interface PreviewSlice {
  // State
  previewUrl: string | null;
  previewOpen: boolean;
  viewport: Viewport;
  webviewReady: boolean;
  webviewBounds: PreviewBounds | null;

  // Actions
  setPreviewUrl: (url: string | null) => void;
  setPreviewOpen: (open: boolean) => void;
  togglePreview: () => void;
  setViewport: (v: Viewport) => void;
  setWebviewReady: (ready: boolean) => void;
  updateWebviewBounds: (bounds: PreviewBounds) => void;
  destroyWebview: () => void;
}

export const createPreviewSlice: StateCreator<PreviewSlice, [], [], PreviewSlice> = (set) => ({
  previewUrl: null,
  previewOpen: true, // Default; hydrated from DB via loadSettingsFromDB
  viewport: "desktop",
  webviewReady: false,
  webviewBounds: null,

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

  setWebviewReady: (webviewReady) => set({ webviewReady }),

  updateWebviewBounds: (bounds) => {
    set({ webviewBounds: bounds });
    preview.resize(bounds).catch((e) => console.error("[Preview] resize:", e));
  },

  destroyWebview: () => {
    preview.destroy().catch((e) => console.error("[Preview] destroy:", e));
    set({ webviewReady: false, webviewBounds: null, previewUrl: null });
  },
});
