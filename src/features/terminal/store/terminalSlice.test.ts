import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import { createTerminalSlice, type TerminalSlice } from "./terminalSlice";

function createTestStore() {
  return create<TerminalSlice>()((...args) => createTerminalSlice(...args));
}

describe("terminalSlice", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it("starts with empty tabs", () => {
    const state = store.getState();
    expect(state.tabs).toEqual([]);
    expect(state.activeTab).toBe("");
  });

  it("addTab adds a tab and sets it active", () => {
    store.getState().addTab({ id: "t1", label: "Terminal 1" });
    const state = store.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0]?.id).toBe("t1");
    expect(state.activeTab).toBe("t1");
  });

  it("removeTab removes tab and selects last remaining", () => {
    store.getState().addTab({ id: "t1", label: "Terminal 1" });
    store.getState().addTab({ id: "t2", label: "Terminal 2" });
    store.getState().setActiveTab("t1");
    store.getState().removeTab("t1");

    const state = store.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTab).toBe("t2");
  });

  it("removeTab clears activeTab when last tab removed", () => {
    store.getState().addTab({ id: "t1", label: "Terminal 1" });
    store.getState().removeTab("t1");

    const state = store.getState();
    expect(state.tabs).toHaveLength(0);
    expect(state.activeTab).toBe("");
  });

  it("renameTab updates tab label", () => {
    store.getState().addTab({ id: "t1", label: "Terminal 1" });
    store.getState().renameTab("t1", "Renamed");

    expect(store.getState().tabs[0]?.label).toBe("Renamed");
  });

  it("reorderTabs moves tabs correctly", () => {
    store.getState().addTab({ id: "t1", label: "Terminal 1" });
    store.getState().addTab({ id: "t2", label: "Terminal 2" });
    store.getState().addTab({ id: "t3", label: "Terminal 3" });
    store.getState().reorderTabs(0, 2);

    const ids = store.getState().tabs.map((t) => t.id);
    expect(ids).toEqual(["t2", "t3", "t1"]);
  });

  it("markExited adds to exitedTabs and notifies if not active", () => {
    store.getState().addTab({ id: "t1", label: "Terminal 1" });
    store.getState().addTab({ id: "t2", label: "Terminal 2" });
    // activeTab is t2 (last added)
    store.getState().markExited("t1");

    const state = store.getState();
    expect(state.exitedTabs.has("t1")).toBe(true);
    expect(state.notifiedTabs.has("t1")).toBe(true);
  });

  it("markExited does NOT notify if tab is active", () => {
    store.getState().addTab({ id: "t1", label: "Terminal 1" });
    // activeTab is t1
    store.getState().markExited("t1");

    expect(store.getState().notifiedTabs.has("t1")).toBe(false);
  });

  it("setActiveTab clears notification for that tab", () => {
    store.getState().addTab({ id: "t1", label: "Terminal 1" });
    store.getState().addTab({ id: "t2", label: "Terminal 2" });
    store.getState().markExited("t1"); // notifies t1
    store.getState().setActiveTab("t1"); // should clear notification

    expect(store.getState().notifiedTabs.has("t1")).toBe(false);
  });

  it("clearTabs resets everything", () => {
    store.getState().addTab({ id: "t1", label: "Terminal 1" });
    store.getState().markExited("t1");
    store.getState().clearTabs();

    const state = store.getState();
    expect(state.tabs).toEqual([]);
    expect(state.activeTab).toBe("");
    expect(state.exitedTabs.size).toBe(0);
    expect(state.notifiedTabs.size).toBe(0);
  });
});
