// ── Combined Zustand Store ───────────────────────────────────────────────────
// All feature slices merged into a single store.

import { create } from "zustand";
import { createTerminalSlice, type TerminalSlice } from "@features/terminal/store/terminalSlice";
import { createProjectSlice, type ProjectSlice } from "@features/project/store/projectSlice";
import { createEditorSlice, type EditorSlice } from "@features/editor/store/editorSlice";
import { createPreviewSlice, type PreviewSlice } from "@features/preview/store/previewSlice";
import { createExplorerSlice, type ExplorerSlice } from "@features/explorer/store/explorerSlice";
import { createSettingsSlice, type SettingsSlice } from "@features/settings/store/settingsSlice";
import { createGitSlice, type GitSlice } from "@features/git/store/gitSlice";
import { createActivitySlice, type ActivitySlice } from "@features/activity/store/activitySlice";
import { createSshSlice, type SshSlice } from "@features/ssh/store/sshSlice";
import { createChatSlice, type ChatSlice } from "@features/chat/store/chatSlice";

export type AppStore = TerminalSlice &
  ProjectSlice &
  EditorSlice &
  PreviewSlice &
  ExplorerSlice &
  SettingsSlice &
  GitSlice &
  ActivitySlice &
  SshSlice &
  ChatSlice;

export const useAppStore = create<AppStore>()((...args) => ({
  ...createTerminalSlice(...args),
  ...createProjectSlice(...args),
  ...createEditorSlice(...args),
  ...createPreviewSlice(...args),
  ...createExplorerSlice(...args),
  ...createSettingsSlice(...args),
  ...createGitSlice(...args),
  ...createActivitySlice(...args),
  ...createSshSlice(...args),
  ...createChatSlice(...args),
}));

// Re-export types for convenience
export type { TerminalSlice } from "@features/terminal/store/terminalSlice";
export type { ProjectSlice } from "@features/project/store/projectSlice";
export type { EditorSlice } from "@features/editor/store/editorSlice";
export type { PreviewSlice } from "@features/preview/store/previewSlice";
export type { ExplorerSlice } from "@features/explorer/store/explorerSlice";
export type { SettingsSlice } from "@features/settings/store/settingsSlice";
export type { GitSlice } from "@features/git/store/gitSlice";
export type { ActivitySlice } from "@features/activity/store/activitySlice";
export type { SshSlice } from "@features/ssh/store/sshSlice";
export type { ChatSlice } from "@features/chat/store/chatSlice";
