// ── Terminal Slice ────────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";
import type { TerminalTab } from "@shared/lib/types";

export interface TerminalSlice {
  // State
  tabs: TerminalTab[];
  activeTab: string;
  exitedTabs: Set<string>;
  notifiedTabs: Set<string>;

  // Actions
  addTab: (tab: TerminalTab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  renameTab: (id: string, label: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  markExited: (id: string) => void;
  clearNotification: (id: string) => void;
  clearTabs: () => void;
}

export const createTerminalSlice: StateCreator<TerminalSlice, [], [], TerminalSlice> = (set) => ({
  tabs: [],
  activeTab: "",
  exitedTabs: new Set<string>(),
  notifiedTabs: new Set<string>(),

  addTab: (tab) =>
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTab: tab.id,
    })),

  removeTab: (id) =>
    set((s) => {
      const next = s.tabs.filter((t) => t.id !== id);
      const nextExited = new Set(s.exitedTabs);
      nextExited.delete(id);
      const nextNotified = new Set(s.notifiedTabs);
      nextNotified.delete(id);
      const newActive =
        s.activeTab === id && next.length > 0 ? (next[next.length - 1]?.id ?? "") : s.activeTab;
      return {
        tabs: next,
        activeTab: next.length === 0 ? "" : newActive,
        exitedTabs: nextExited,
        notifiedTabs: nextNotified,
      };
    }),

  setActiveTab: (id) =>
    set((s) => {
      const nextNotified = new Set(s.notifiedTabs);
      nextNotified.delete(id);
      return { activeTab: id, notifiedTabs: nextNotified };
    }),

  renameTab: (id, label) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, label } : t)),
    })),

  reorderTabs: (fromIndex, toIndex) =>
    set((s) => {
      const next = [...s.tabs];
      const [moved] = next.splice(fromIndex, 1);
      if (moved) {
        next.splice(toIndex, 0, moved);
      }
      return { tabs: next };
    }),

  markExited: (id) =>
    set((s) => {
      const next = new Set(s.exitedTabs);
      next.add(id);
      const nextNotified = new Set(s.notifiedTabs);
      if (s.activeTab !== id) {
        nextNotified.add(id);
      }
      return { exitedTabs: next, notifiedTabs: nextNotified };
    }),

  clearNotification: (id) =>
    set((s) => {
      const next = new Set(s.notifiedTabs);
      next.delete(id);
      return { notifiedTabs: next };
    }),

  clearTabs: () =>
    set({
      tabs: [],
      activeTab: "",
      exitedTabs: new Set<string>(),
      notifiedTabs: new Set<string>(),
    }),
});
