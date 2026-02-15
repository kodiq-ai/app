import { describe, it, expect, beforeEach, vi } from "vitest";
import { create } from "zustand";
import { createSettingsSlice, type SettingsSlice } from "./settingsSlice";

// Mock the Tauri bridge DB module
vi.mock("@shared/lib/tauri", () => ({
  db: {
    settings: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue({}),
    },
    projects: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      touch: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

function createTestStore() {
  return create<SettingsSlice>()((...args) => createSettingsSlice(...args));
}

describe("settingsSlice", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    localStorageMock.clear();
    store = createTestStore();
  });

  it("starts with default settings", () => {
    const state = store.getState();
    expect(state.settings.fontSize).toBe(13);
    expect(state.settings.shell).toBe("");
    expect(state.settingsOpen).toBe(false);
  });

  it("updateSettings merges partial settings", () => {
    store.getState().updateSettings({ fontSize: 16 });
    expect(store.getState().settings.fontSize).toBe(16);
    expect(store.getState().settings.shell).toBe(""); // unchanged
  });

  it("updateSettings persists to localStorage", () => {
    store.getState().updateSettings({ shell: "/bin/zsh" });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "kodiq-settings",
      expect.stringContaining("/bin/zsh"),
    );
  });

  it("toggleSettings flips settingsOpen", () => {
    expect(store.getState().settingsOpen).toBe(false);
    store.getState().toggleSettings();
    expect(store.getState().settingsOpen).toBe(true);
    store.getState().toggleSettings();
    expect(store.getState().settingsOpen).toBe(false);
  });

  it("toggleCommandPalette flips commandPaletteOpen", () => {
    expect(store.getState().commandPaletteOpen).toBe(false);
    store.getState().toggleCommandPalette();
    expect(store.getState().commandPaletteOpen).toBe(true);
  });

  it("setSplitRatio updates and persists", () => {
    store.getState().setSplitRatio(0.7);
    expect(store.getState().splitRatio).toBe(0.7);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("kodiq-split-ratio", "0.7");
  });

  it("update state management works", () => {
    store.getState().setUpdateAvailable({
      version: "0.3.0",
      currentVersion: "0.2.0",
      body: "Changelog",
      date: null,
    });
    expect(store.getState().updateAvailable?.version).toBe("0.3.0");
    expect(store.getState().toastDismissed).toBe(false);

    store.getState().setToastDismissed(true);
    expect(store.getState().toastDismissed).toBe(true);
  });
});
