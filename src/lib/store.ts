// ── Compatibility shim ───────────────────────────────────────────────────────
// Re-exports from the new store location. Existing imports from @/lib/store
// continue to work. Gradually migrate to @/store or direct slice imports.

export { useAppStore } from "@/store";
export type { AppStore } from "@/store";

// Re-export types that were previously defined here
export type { TerminalTab as TermTab, FileEntry, CliTool, RecentProject, SavedTab } from "@shared/lib/types";
export type { AppSettings as Settings, Viewport, SidebarTab } from "@shared/lib/types";

