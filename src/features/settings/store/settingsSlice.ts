// ── Settings Slice ───────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";
import type { AppSettings, UpdateInfo } from "@shared/lib/types";
import { DEFAULT_SETTINGS } from "@shared/lib/types";
import { db } from "@shared/lib/tauri";

export interface SettingsSlice {
  // Settings state
  settingsOpen: boolean;
  settings: AppSettings;

  // Command palette & file search
  commandPaletteOpen: boolean;
  fileSearchOpen: boolean;

  // Split ratio
  splitRatio: number;

  // Update state
  updateAvailable: UpdateInfo | null;
  toastDismissed: boolean;
  downloading: boolean;
  downloadProgress: number;

  // Settings actions
  setSettingsOpen: (open: boolean) => void;
  toggleSettings: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Command palette & file search actions
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setFileSearchOpen: (open: boolean) => void;
  toggleFileSearch: () => void;

  // Split ratio actions
  setSplitRatio: (r: number) => void;

  // DB hydration
  loadSettingsFromDB: () => Promise<void>;

  // Update actions
  setUpdateAvailable: (info: UpdateInfo | null) => void;
  setToastDismissed: (dismissed: boolean) => void;
  setDownloading: (downloading: boolean) => void;
  setDownloadProgress: (progress: number) => void;
}

const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem("kodiq-settings");
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const loadSplitRatio = (): number => {
  try {
    const saved = localStorage.getItem("kodiq-split-ratio");
    return saved ? parseFloat(saved) : 0.5;
  } catch {
    return 0.5;
  }
};

export const createSettingsSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (set) => ({
  settingsOpen: false,
  settings: loadSettings(),
  commandPaletteOpen: false,
  fileSearchOpen: false,
  splitRatio: loadSplitRatio(),
  updateAvailable: null,
  toastDismissed: false,
  downloading: false,
  downloadProgress: 0,

  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

  updateSettings: (patch) =>
    set((s) => {
      const next = { ...s.settings, ...patch };
      localStorage.setItem("kodiq-settings", JSON.stringify(next));
      // Persist each changed key to SQLite
      for (const [k, v] of Object.entries(patch)) {
        db.settings.set(k, JSON.stringify(v)).catch((e) => console.error("[DB]", e));
      }
      return { settings: next };
    }),

  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  setFileSearchOpen: (fileSearchOpen) => set({ fileSearchOpen }),
  toggleFileSearch: () => set((s) => ({ fileSearchOpen: !s.fileSearchOpen })),

  setSplitRatio: (splitRatio) => {
    localStorage.setItem("kodiq-split-ratio", String(splitRatio));
    db.settings.set("splitRatio", String(splitRatio)).catch((e) => console.error("[DB]", e));
    set({ splitRatio });
  },

  loadSettingsFromDB: async () => {
    try {
      const all = await db.settings.getAll();
      const patch: Partial<AppSettings> = {};
      if (all["shell"]) patch.shell = all["shell"];
      if (all["fontSize"]) patch.fontSize = parseInt(all["fontSize"]);
      if (all["fontFamily"]) patch.fontFamily = all["fontFamily"];
      if (all["locale"]) patch.locale = all["locale"] as "en" | "ru";
      const splitStr = all["splitRatio"];
      const splitVal = splitStr ? parseFloat(splitStr) : undefined;
      set((s) => ({
        settings: { ...s.settings, ...patch },
        ...(splitVal != null ? { splitRatio: splitVal } : {}),
      }));
    } catch {
      // DB not ready yet — localStorage values already loaded
    }
  },

  setUpdateAvailable: (updateAvailable) => set({ updateAvailable, toastDismissed: false }),
  setToastDismissed: (toastDismissed) => set({ toastDismissed }),
  setDownloading: (downloading) => set({ downloading }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
});
