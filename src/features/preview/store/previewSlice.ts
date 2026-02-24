// ── Preview Slice ────────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";
import type {
  Viewport,
  PreviewBounds,
  ServerInfo,
  ServerConfig,
  ConsoleEntry,
  ConsoleLevel,
  DevToolsTab,
  NetworkEntry,
  InspectResult,
} from "@shared/lib/types";
import { db, preview } from "@shared/lib/tauri";

export interface PreviewSlice {
  // -- Webview State ──────────────────────────────────────
  previewUrl: string | null;
  previewOpen: boolean;
  viewport: Viewport;
  webviewReady: boolean;
  webviewBounds: PreviewBounds | null;

  // -- Server State ───────────────────────────────────────
  serverId: string | null;
  serverStatus: "idle" | "starting" | "running" | "stopped";
  servers: ServerInfo[];

  // -- Webview Actions ────────────────────────────────────
  setPreviewUrl: (url: string | null) => void;
  setPreviewOpen: (open: boolean) => void;
  togglePreview: () => void;
  setViewport: (v: Viewport) => void;
  setWebviewReady: (ready: boolean) => void;
  updateWebviewBounds: (bounds: PreviewBounds) => void;
  destroyWebview: () => void;

  // -- DevTools State ─────────────────────────────────────
  consoleLogs: ConsoleEntry[];
  networkEntries: NetworkEntry[];
  devtoolsOpen: boolean;
  devtoolsTab: DevToolsTab;
  consoleFilter: ConsoleLevel | "all";

  // -- Inspect State ─────────────────────────────────────
  inspectMode: boolean;
  inspectResult: InspectResult | null;

  // -- Server Actions ─────────────────────────────────────
  startServer: (config: ServerConfig) => Promise<void>;
  stopServer: (id?: string) => Promise<void>;
  refreshServers: () => Promise<void>;
  setServerReady: (id: string, port: number) => void;
  setServerStopped: (id: string) => void;

  // -- DevTools Actions ──────────────────────────────────
  pushConsoleEntry: (entry: ConsoleEntry) => void;
  clearConsole: () => void;
  pushNetworkEntry: (entry: NetworkEntry) => void;
  clearNetwork: () => void;
  setDevtoolsOpen: (open: boolean) => void;
  toggleDevtools: () => void;
  setDevtoolsTab: (tab: DevToolsTab) => void;
  setConsoleFilter: (filter: ConsoleLevel | "all") => void;

  // -- Inspect Actions ────────────────────────────────────
  setInspectMode: (on: boolean) => void;
  setInspectResult: (result: InspectResult | null) => void;
  clearInspectResult: () => void;
}

export const createPreviewSlice: StateCreator<PreviewSlice, [], [], PreviewSlice> = (set, get) => ({
  // -- Webview Defaults ──────────────────────────────────
  previewUrl: null,
  previewOpen: true, // Default; hydrated from DB via loadSettingsFromDB
  viewport: "desktop",
  webviewReady: false,
  webviewBounds: null,

  // -- Server Defaults ───────────────────────────────────
  serverId: null,
  serverStatus: "idle",
  servers: [],

  // -- DevTools Defaults ────────────────────────────────
  consoleLogs: [],
  networkEntries: [],
  devtoolsOpen: false,
  devtoolsTab: "console",
  consoleFilter: "all",

  // -- Inspect Defaults ──────────────────────────────────
  inspectMode: false,
  inspectResult: null,

  // -- Webview Actions ───────────────────────────────────

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

  // -- Server Actions ────────────────────────────────────

  startServer: async (config) => {
    try {
      set({ serverStatus: "starting" });
      const id = await preview.startServer(config);
      set({ serverId: id, serverStatus: "starting" });
      // Status transitions to "running" via setServerReady (called from event listener)
      await get().refreshServers();
    } catch (e) {
      console.error("[Preview] start server:", e);
      set({ serverStatus: "idle" });
    }
  },

  stopServer: async (id) => {
    const targetId = id ?? get().serverId;
    if (!targetId) return;
    try {
      await preview.stopServer(targetId);
      set((s) => ({
        serverStatus: s.serverId === targetId ? "stopped" : s.serverStatus,
      }));
      await get().refreshServers();
    } catch (e) {
      console.error("[Preview] stop server:", e);
    }
  },

  refreshServers: async () => {
    try {
      const servers = await preview.listServers();
      set({ servers });
    } catch (e) {
      console.error("[Preview] list servers:", e);
    }
  },

  setServerReady: (id, port) => {
    set((s) => ({
      serverStatus: s.serverId === id ? "running" : s.serverStatus,
      previewUrl: s.serverId === id ? `http://localhost:${port}` : s.previewUrl,
    }));
  },

  setServerStopped: (id) => {
    set((s) => ({
      serverStatus: s.serverId === id ? "stopped" : s.serverStatus,
    }));
  },

  // -- DevTools Actions ───────────────────────────────────

  pushConsoleEntry: (entry) =>
    set((s) => ({
      consoleLogs: [...s.consoleLogs.slice(-499), entry], // Keep last 500
    })),

  clearConsole: () => set({ consoleLogs: [] }),

  pushNetworkEntry: (entry) =>
    set((s) => ({
      networkEntries: [...s.networkEntries.slice(-499), entry], // Keep last 500
    })),

  clearNetwork: () => set({ networkEntries: [] }),

  setDevtoolsOpen: (devtoolsOpen) => set({ devtoolsOpen }),

  toggleDevtools: () => set((s) => ({ devtoolsOpen: !s.devtoolsOpen })),

  setDevtoolsTab: (devtoolsTab) => set({ devtoolsTab }),

  setConsoleFilter: (consoleFilter) => set({ consoleFilter }),

  // -- Inspect Actions ─────────────────────────────────────

  setInspectMode: (inspectMode) => set({ inspectMode }),

  setInspectResult: (inspectResult) => set({ inspectResult }),

  clearInspectResult: () => set({ inspectResult: null }),
});
