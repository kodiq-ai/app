import { useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

import { toast } from "sonner";
import { useAppStore, loadSavedTabs, type FileEntry, type CliTool } from "@/lib/store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { X, Settings, PanelRightClose, PanelRightOpen } from "lucide-react";

import { useSplitDrag } from "@/hooks/useSplitDrag";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommandPalette } from "@/components/CommandPalette";
import { ActivityBar } from "@/components/ActivityBar";
import { TabBar } from "@/components/TabBar";
import { ActivePanel } from "@/components/ActivePanel";
import { FileViewer } from "@/components/FileViewer";
import { SettingsDialog } from "@/components/SettingsDialog";
import { FileSearch } from "@/components/FileSearch";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { EmptyState } from "@/components/EmptyState";

// ─── Main App ───────────────────────────────────────────────────────────────

export default function App() {
  // ── Zustand store ──────────────────────────────────────────────────────
  const projectPath = useAppStore((s) => s.projectPath);
  const projectName = useAppStore((s) => s.projectName);
  const recentProjects = useAppStore((s) => s.recentProjects);
  const setProject = useAppStore((s) => s.setProject);
  const tabs = useAppStore((s) => s.tabs);
  const addTab = useAppStore((s) => s.addTab);
  const removeTab = useAppStore((s) => s.removeTab);
  const clearTabs = useAppStore((s) => s.clearTabs);
  const setFileTree = useAppStore((s) => s.setFileTree);
  const setCliTools = useAppStore((s) => s.setCliTools);
  const addRecent = useAppStore((s) => s.addRecent);
  const splitRatio = useAppStore((s) => s.splitRatio);
  const previewOpen = useAppStore((s) => s.previewOpen);
  const togglePreview = useAppStore((s) => s.togglePreview);
  const setPreviewUrl = useAppStore((s) => s.setPreviewUrl);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  const { panelsRef, isDragging, startDrag } = useSplitDrag();

  // ── Helpers ────────────────────────────────────────────────────────────

  const loadFileTree = async (path: string) => {
    try {
      const entries = await invoke<FileEntry[]>("read_dir", { path });
      setFileTree(entries);
    } catch (e) {
      toast.error(t("failedToLoadFiles"), { description: String(e) });
    }
  };

  const spawnTab = useCallback(async (command?: string, label?: string) => {
    try {
      const { projectPath, settings } = useAppStore.getState();
      const id = await invoke<string>("spawn_terminal", {
        command: command || null,
        cwd: projectPath,
        shell: settings.shell || null,
      });
      addTab({
        id,
        label: label || (command ? command : t("terminal")),
        command: command || "shell",
      });
      return id;
    } catch (e) {
      toast.error(t("failedToSpawnTerminal"), { description: String(e) });
      return null;
    }
  }, [addTab]);

  const closeTab = useCallback((id: string) => {
    invoke("close_terminal", { id }).catch(() => {});
    removeTab(id);
  }, [removeTab]);

  const openProject = async (path: string) => {
    const name = path.split("/").pop() || "project";
    setProject(path, name);
    setPreviewUrl(null);
    useAppStore.getState().setOpenFile(null);
    addRecent({ name, path });
    loadFileTree(path);

    // Restore saved tabs or create a default one
    const saved = loadSavedTabs(path);
    if (saved.length > 0) {
      // Re-spawn terminals for each saved tab (sequentially to keep order)
      setTimeout(async () => {
        for (const st of saved) {
          const cmd = st.command === "shell" ? undefined : st.command;
          await spawnTab(cmd, st.label);
        }
      }, 100);
    } else {
      setTimeout(() => spawnTab(undefined, t("terminal")), 100);
    }
  };

  const closeProject = () => {
    tabs.forEach((t) => invoke("close_terminal", { id: t.id }).catch(() => {}));
    clearTabs();
    setFileTree([]);
    setProject(null);
    setPreviewUrl(null);
    useAppStore.getState().setOpenFile(null);
    setSettingsOpen(false);
  };

  const handleOpenFolder = async () => {
    const selected = await open({ directory: true, title: t("selectProjectFolder") });
    if (selected && typeof selected === "string") {
      openProject(selected);
    }
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useKeyboardShortcuts({ spawnTab, closeTab });

  // ── Init: detect CLI tools, restore project, request notifications ──────
  useEffect(() => {
    invoke<CliTool[]>("detect_cli_tools").then(setCliTools).catch(() => {});

    // Hydrate from SQLite (overrides localStorage snapshot)
    useAppStore.getState().loadSettingsFromDB?.();
    useAppStore.getState().loadProjectFromDB?.();

    // Request notification permission for terminal exit alerts
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const savedPath = localStorage.getItem("kodiq-project-path");
    if (savedPath) {
      openProject(savedPath);
    }
  }, []);

  // ── Port detection ────────────────────────────────────────────────────
  useEffect(() => {
    const unlisten = listen<{ id: string; port: number; url: string }>("port-detected", (event) => {
      setPreviewUrl(event.payload.url);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // ─── Layout ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--bg-base)]">
      {/* Modals */}
      <CommandPalette
        onSpawnTab={spawnTab}
        onOpenFolder={handleOpenFolder}
        onCloseProject={closeProject}
      />
      <SettingsDialog />
      <FileSearch />

      {/* Title bar */}
      <header className="flex items-center h-[52px] px-4 border-b border-white/[0.06] shrink-0 select-none" data-tauri-drag-region>
        <div className="w-[80px] shrink-0" />
        <div className="flex-1 flex items-center justify-center" data-tauri-drag-region>
          <ProjectSwitcher
            projectName={projectName}
            projectPath={projectPath}
            recentProjects={recentProjects}
            onOpenProject={openProject}
            onOpenFolder={handleOpenFolder}
            onCloseProject={closeProject}
          />
        </div>
        <div className="w-[100px] flex items-center justify-end gap-1">
          {projectPath && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={togglePreview}
                  className={cn(
                    "text-[#52525c] hover:text-[#a1a1aa]",
                    previewOpen && "text-[#a1a1aa]"
                  )}
                >
                  {previewOpen ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{previewOpen ? t("hidePreviewShort") : t("showPreviewShort")}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSettingsOpen(true)}
                className="text-[#52525c] hover:text-[#a1a1aa]"
              >
                <Settings className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("settings")}</TooltipContent>
          </Tooltip>
          {projectPath && (
            <>
              <span className="text-[10px] text-[#3f3f46] tabular-nums">{tabs.length}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={closeProject}
                    className="text-[#52525c] hover:text-[#a1a1aa]"
                  >
                    <X className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("closeProject")}</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {projectPath ? (
          <>
            {/* Panels */}
            <div ref={panelsRef} className="flex flex-1 overflow-hidden" style={{ cursor: isDragging ? "col-resize" : undefined }}>
              {/* Terminal panel */}
              <div className="flex overflow-hidden relative" style={{ width: previewOpen ? `${splitRatio * 100}%` : "100%" }}>
                <ErrorBoundary name="terminal" fallbackTitle={t("terminalError")}>
                  <TabBar onSpawnTab={spawnTab} onCloseTab={closeTab} />
                </ErrorBoundary>
                <FileViewer />
              </div>

              {/* Divider + Preview (only when open) */}
              {previewOpen && (
                <>
                  <div
                    className="w-px cursor-col-resize shrink-0 group relative"
                    onMouseDown={startDrag}
                  >
                    <div className={cn(
                      "absolute inset-y-0 -left-[2px] w-[5px] transition-all",
                      isDragging ? "bg-[#14b8a6]/30" : "bg-transparent group-hover:bg-white/[0.04]"
                    )} />
                    <div className={cn(
                      "absolute inset-0 transition-colors",
                      isDragging ? "bg-[#14b8a6]" : "bg-white/[0.06]"
                    )} />
                  </div>

                  <ErrorBoundary name="preview" fallbackTitle={t("previewError")}>
                    <ActivePanel />
                  </ErrorBoundary>
                </>
              )}
            </div>

            {/* Activity Bar + Side Panel — right side */}
            <ErrorBoundary name="explorer" fallbackTitle={t("fileTreeError")}>
              <ActivityBar />
            </ErrorBoundary>
          </>
        ) : (
          <EmptyState onOpenFolder={handleOpenFolder} onOpenProject={openProject} />
        )}
      </div>
    </div>
  );
}
