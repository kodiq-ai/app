import { useHotkeys } from "react-hotkeys-hook";
import { useAppStore } from "@/lib/store";
import { fs } from "@shared/lib/tauri";
import { handleError } from "@shared/lib/errors";
import { destroyEditorView } from "@features/editor/lib/viewCache";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import type { LaunchConfigPayload } from "@shared/lib/types";

interface ShortcutActions {
  spawnTab: (
    command?: string,
    label?: string,
    env?: Record<string, string>,
  ) => Promise<string | null>;
  closeTab: (id: string) => void;
  reopenTab: () => void;
}

export function useKeyboardShortcuts({ spawnTab, closeTab, reopenTab }: ShortcutActions) {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleCommandPalette = useAppStore((s) => s.toggleCommandPalette);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const toggleFileSearch = useAppStore((s) => s.toggleFileSearch);
  const togglePreview = useAppStore((s) => s.togglePreview);

  // ⌘S — save active editor tab
  useHotkeys(
    "mod+s",
    (e) => {
      e.preventDefault();
      const { activeEditorTab, editorTabs, markTabSaved } = useAppStore.getState();
      if (!activeEditorTab) return;
      const tab = editorTabs.find((t) => t.path === activeEditorTab);
      if (!tab || tab.content === tab.savedContent) return;
      const contentToSave = tab.content;
      fs.writeFile(tab.path, contentToSave)
        .then(() => {
          markTabSaved(tab.path, contentToSave);
          toast.success(t("fileSaved"));
        })
        .catch((err) => handleError(err, t("failedToSave")));
    },
    { enableOnFormTags: true },
  );

  // ⌘K — command palette
  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      toggleCommandPalette();
    },
    { enableOnFormTags: true },
  );

  // ⌘T — new terminal
  useHotkeys(
    "mod+t",
    (e) => {
      e.preventDefault();
      if (useAppStore.getState().projectPath) spawnTab(undefined, t("terminal"));
    },
    { enableOnFormTags: true },
  );

  // ⌘W — close active tab
  useHotkeys(
    "mod+w",
    (e) => {
      e.preventDefault();
      const { projectPath, activeTab } = useAppStore.getState();
      if (projectPath && activeTab) closeTab(activeTab);
    },
    { enableOnFormTags: true },
  );

  // ⌘⇧T — reopen closed tab
  useHotkeys(
    "mod+shift+t",
    (e) => {
      e.preventDefault();
      if (useAppStore.getState().projectPath) {
        reopenTab();
      }
    },
    { enableOnFormTags: true },
  );

  // ⌘B — toggle sidebar
  useHotkeys(
    "mod+b",
    (e) => {
      e.preventDefault();
      toggleSidebar();
    },
    { enableOnFormTags: true },
  );

  // ⌘P — file search
  useHotkeys(
    "mod+p",
    (e) => {
      e.preventDefault();
      if (useAppStore.getState().projectPath) toggleFileSearch();
    },
    { enableOnFormTags: true },
  );

  // ⌘, — settings
  useHotkeys(
    "mod+comma",
    (e) => {
      e.preventDefault();
      toggleSettings();
    },
    { enableOnFormTags: true },
  );

  // ⌘\ — toggle preview panel
  useHotkeys(
    "mod+backslash",
    (e) => {
      e.preventDefault();
      if (useAppStore.getState().projectPath) togglePreview();
    },
    { enableOnFormTags: true },
  );

  // ⌘⇧L — relaunch last used config
  useHotkeys(
    "mod+shift+l",
    (e) => {
      e.preventDefault();
      const { projectPath, lastLaunchConfigId, launchConfigs } = useAppStore.getState();
      if (!projectPath || !lastLaunchConfigId) return;
      const config = launchConfigs.find((c) => c.id === lastLaunchConfigId);
      if (!config) return;
      try {
        const payload: LaunchConfigPayload = JSON.parse(config.config);
        const parts = [config.cli_name, ...payload.args];
        const command = parts.join(" ");
        const env = Object.keys(payload.env).length > 0 ? payload.env : undefined;
        spawnTab(command, config.profile_name, env);
      } catch {
        spawnTab(config.cli_name, config.profile_name);
      }
    },
    { enableOnFormTags: true },
  );

  // Escape — close active editor tab (only if clean)
  useHotkeys(
    "escape",
    () => {
      const { activeEditorTab, closeEditorTab } = useAppStore.getState();
      if (!activeEditorTab) return;
      const closed = closeEditorTab(activeEditorTab);
      if (closed) {
        destroyEditorView(activeEditorTab);
      }
    },
    { enableOnFormTags: false },
  );

  // ⌘1-9 — switch tabs
  useHotkeys(
    "mod+1,mod+2,mod+3,mod+4,mod+5,mod+6,mod+7,mod+8,mod+9",
    (e, handler) => {
      e.preventDefault();
      const key = (handler as unknown as { keys?: string[] })?.keys?.[0];
      if (!key) return;
      const idx = parseInt(key) - 1;
      const { tabs, setActiveTab } = useAppStore.getState();
      if (idx >= 0 && idx < tabs.length) {
        const tab = tabs[idx];
        if (tab) {
          setActiveTab(tab.id);
        }
      }
    },
    { enableOnFormTags: true },
  );
}
