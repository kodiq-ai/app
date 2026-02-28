// ── EditorView Cache ────────────────────────────────────────────────────────
// Module-level Map of EditorView instances per tab path.
// Views survive React re-renders — detached from DOM on unmount, reattached on mount.

import type { EditorView } from "@codemirror/view";
import type { Compartment } from "@codemirror/state";

export interface ViewEntry {
  view: EditorView;
  langCompartment: Compartment;
  settingsCompartment: Compartment;
}

const viewCache = new Map<string, ViewEntry>();

export function getViewEntry(path: string): ViewEntry | undefined {
  return viewCache.get(path);
}

export function setViewEntry(path: string, entry: ViewEntry): void {
  viewCache.set(path, entry);
}

export function hasViewEntry(path: string): boolean {
  return viewCache.has(path);
}

export function destroyEditorView(path: string): void {
  const entry = viewCache.get(path);
  if (entry) {
    entry.view.destroy();
    viewCache.delete(path);
  }
}

export function destroyAllEditorViews(): void {
  for (const [, entry] of viewCache) {
    entry.view.destroy();
  }
  viewCache.clear();
}
