// ── Preview Slice ────────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";
import type { Viewport } from "@shared/lib/types";

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

const loadPreviewOpen = (): boolean => {
  try {
    const saved = localStorage.getItem("kodiq-preview-open");
    return saved !== null ? saved === "true" : true;
  } catch {
    return true;
  }
};

export const createPreviewSlice: StateCreator<PreviewSlice, [], [], PreviewSlice> = (set) => ({
  previewUrl: null,
  previewOpen: loadPreviewOpen(),
  viewport: "desktop",

  setPreviewUrl: (previewUrl) => set({ previewUrl }),

  setPreviewOpen: (previewOpen) => {
    localStorage.setItem("kodiq-preview-open", String(previewOpen));
    set({ previewOpen });
  },

  togglePreview: () =>
    set((s) => {
      const next = !s.previewOpen;
      localStorage.setItem("kodiq-preview-open", String(next));
      return { previewOpen: next };
    }),

  setViewport: (viewport) => set({ viewport }),
});
