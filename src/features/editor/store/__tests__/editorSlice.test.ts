import { describe, it, expect } from "vitest";
import { createEditorSlice } from "../editorSlice";

// -- Minimal Zustand mock -------
function createTestStore() {
  let state: ReturnType<typeof createEditorSlice>;
  const set = (partial: unknown) => {
    const next = typeof partial === "function" ? partial(state) : partial;
    state = { ...state, ...next };
  };
  const get = () => state;
  state = createEditorSlice(set as never, get as never, {} as never);
  return { get: () => state, set };
}

describe("editorSlice — cursorInfo", () => {
  it("starts with cursorInfo null", () => {
    const { get } = createTestStore();
    expect(get().cursorInfo).toBeNull();
  });

  it("setCursorInfo updates state", () => {
    const { get } = createTestStore();
    get().setCursorInfo({ line: 10, col: 5, selected: 3 });
    expect(get().cursorInfo).toEqual({ line: 10, col: 5, selected: 3 });
  });

  it("setCursorInfo(null) clears state", () => {
    const { get } = createTestStore();
    get().setCursorInfo({ line: 1, col: 1, selected: 0 });
    get().setCursorInfo(null);
    expect(get().cursorInfo).toBeNull();
  });
});
