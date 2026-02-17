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

  // Onboarding
  onboardingComplete: boolean;

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

  // Onboarding actions
  setOnboardingComplete: (complete: boolean) => void;

  // Update actions
  setUpdateAvailable: (info: UpdateInfo | null) => void;
  setToastDismissed: (dismissed: boolean) => void;
  setDownloading: (downloading: boolean) => void;
  setDownloadProgress: (progress: number) => void;
}

export const createSettingsSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (set) => ({
  settingsOpen: false,
  settings: DEFAULT_SETTINGS, // Hydrated from DB via loadSettingsFromDB
  commandPaletteOpen: false,
  fileSearchOpen: false,
  splitRatio: 0.5, // Hydrated from DB via loadSettingsFromDB
  onboardingComplete: false, // Hydrated from DB via loadSettingsFromDB
  updateAvailable: null,
  toastDismissed: false,
  downloading: false,
  downloadProgress: 0,

  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

  updateSettings: (patch) =>
    set((s) => {
      const next = { ...s.settings, ...patch };
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
    db.settings.set("splitRatio", String(splitRatio)).catch((e) => console.error("[DB]", e));
    set({ splitRatio });
  },

  loadSettingsFromDB: async () => {
    // Helper: values were stored via JSON.stringify, so "\"zsh\"" needs unwrapping
    const parse = (v: string | undefined): string | undefined => {
      if (!v) return undefined;
      try {
        const p = JSON.parse(v);
        return typeof p === "string" ? p : v;
      } catch {
        return v;
      }
    };
    const parseNum = (v: string | undefined): number | undefined => {
      if (!v) return undefined;
      try {
        const p = JSON.parse(v);
        return typeof p === "number" ? p : parseFloat(v);
      } catch {
        return parseFloat(v) || undefined;
      }
    };

    try {
      const all = await db.settings.getAll();
      const patch: Partial<AppSettings> = {};
      const shell = parse(all["shell"]);
      if (shell) patch.shell = shell;
      const fontSize = parseNum(all["fontSize"]);
      if (fontSize) patch.fontSize = fontSize;
      const fontFamily = parse(all["fontFamily"]);
      if (fontFamily) patch.fontFamily = fontFamily;
      const locale = parse(all["locale"]);
      if (locale === "en" || locale === "ru") patch.locale = locale;
      const splitVal = parseNum(all["splitRatio"]);
      const onboarding = all["onboardingComplete"] === "true" ? true : undefined;
      const previewOpen =
        all["previewOpen"] !== undefined && all["previewOpen"] !== null
          ? all["previewOpen"] === "true"
          : undefined;
      if (all["autoOpenPreview"] !== undefined)
        patch.autoOpenPreview = all["autoOpenPreview"] !== "false";
      set((s) => ({
        settings: { ...s.settings, ...patch },
        ...(splitVal !== undefined && splitVal !== null ? { splitRatio: splitVal } : {}),
        ...(onboarding !== undefined && onboarding !== null
          ? { onboardingComplete: onboarding }
          : {}),
        ...(previewOpen !== undefined && previewOpen !== null ? { previewOpen } : {}),
      }));
    } catch {
      // DB not ready yet — defaults used
    }
  },

  setOnboardingComplete: (onboardingComplete) => {
    db.settings
      .set("onboardingComplete", String(onboardingComplete))
      .catch((e) => console.error("[DB]", e));
    set({ onboardingComplete });
  },

  setUpdateAvailable: (updateAvailable) => set({ updateAvailable, toastDismissed: false }),
  setToastDismissed: (toastDismissed) => set({ toastDismissed }),
  setDownloading: (downloading) => set({ downloading }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
});
