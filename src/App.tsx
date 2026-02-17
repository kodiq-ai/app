import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

import { toast } from "sonner";
import { useAppStore, type FileEntry, type CliTool } from "@/lib/store";
import type { GitInfo } from "@shared/lib/types";
import { db } from "@shared/lib/tauri";
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
import { OnboardingWizard } from "@features/settings/components/OnboardingWizard";
import { UpdateBadge } from "@features/settings/components/UpdateBadge";
import { UpdateDialog } from "@features/settings/components/UpdateDialog";

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
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const cliTools = useAppStore((s) => s.cliTools);

  const [defaultShell, setDefaultShell] = useState("");
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

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

  const spawnTab = useCallback(
    async (command?: string, label?: string) => {
      try {
        const { projectPath, projectId, settings, tabs: currentTabs } = useAppStore.getState();
        const id = await invoke<string>("spawn_terminal", {
          command: command || null,
          cwd: projectPath,
          shell: settings.shell || null,
        });
        const tabLabel = label || (command ? command : t("terminal"));
        addTab({ id, label: tabLabel, command: command || "shell" });
        // Log to activity
        if (command) {
          useAppStore.getState().addActivity({ type: "command", label: command });
        }
        // Persist session to SQLite
        if (projectId) {
          db.sessions
            .save({
              id,
              project_id: projectId,
              label: tabLabel,
              command: command || null,
              cwd: projectPath,
              sort_order: currentTabs.length,
            })
            .catch((e) => console.error("[DB] save session:", e));
        }
        return id;
      } catch (e) {
        toast.error(t("failedToSpawnTerminal"), { description: String(e) });
        return null;
      }
    },
    [addTab],
  );

  const closeTab = useCallback(
    (id: string) => {
      invoke("close_terminal", { id }).catch(() => {});
      removeTab(id);
      db.sessions.close(id).catch((e) => console.error("[DB] close session:", e));
    },
    [removeTab],
  );

  const reopenTab = useCallback(() => {
    const closed = useAppStore.getState().popClosedTab();
    if (!closed) {
      return;
    }
    const cmd = closed.command === "shell" || !closed.command ? undefined : closed.command;
    spawnTab(cmd, closed.label);
  }, [spawnTab]);

  const openProject = (path: string) => {
    const name = path.split("/").pop() || "project";
    setProject(path, name);
    setPreviewUrl(null);
    useAppStore.getState().setOpenFile(null);
    addRecent({ name, path });
    loadFileTree(path);

    // Capture initial git state for activity log diff
    useAppStore.getState().clearActivity();
    invoke<GitInfo>("get_git_info", { path })
      .then((info) => {
        const files = [
          ...(info.modified || []),
          ...(info.added || []),
          ...(info.deleted || []),
          ...(info.untracked || []),
        ];
        useAppStore.getState().setSessionStartFiles(files);
      })
      .catch(() => {});

    // Restore sessions from SQLite, fallback to localStorage, then default
    setTimeout(async () => {
      try {
        const project = await db.projects.getOrCreate(name, path);
        const saved = await db.sessions.list(project.id);
        // Mark old sessions as closed (will be re-created with new PTY ids)
        await db.sessions.closeAll(project.id);

        if (saved.length > 0) {
          for (const s of saved) {
            const cmd = s.command === "shell" || !s.command ? undefined : s.command;
            await spawnTab(cmd, s.label);
          }
          return;
        }
      } catch (e) {
        console.error("[DB] restore sessions:", e);
      }

      // Default: use project's default CLI or plain terminal
      const { defaultCli } = useAppStore.getState();
      if (defaultCli) {
        const tool = useAppStore
          .getState()
          .cliTools.find((t) => t.bin === defaultCli && t.installed);
        await spawnTab(defaultCli, tool?.name || defaultCli);
      } else {
        await spawnTab(undefined, t("terminal"));
      }
    }, 100);
  };

  const closeProject = () => {
    const { projectId } = useAppStore.getState();
    tabs.forEach((tab) => invoke("close_terminal", { id: tab.id }).catch(() => {}));
    if (projectId) {
      db.sessions.closeAll(projectId).catch((e) => console.error("[DB] closeAll:", e));
    }
    clearTabs();
    setFileTree([]);
    setProject(null);
    setPreviewUrl(null);
    useAppStore.getState().setOpenFile(null);
    useAppStore.getState().clearActivity();
    setSettingsOpen(false);
  };

  const handleOpenFolder = async () => {
    const selected = await open({ directory: true, title: t("selectProjectFolder") });
    if (selected && typeof selected === "string") {
      openProject(selected);
    }
  };

  /** Returns selected path without opening the project (for onboarding). */
  const pickFolder = async (): Promise<string | null> => {
    const selected = await open({ directory: true, title: t("selectProjectFolder") });
    return selected && typeof selected === "string" ? selected : null;
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useKeyboardShortcuts({ spawnTab, closeTab, reopenTab });

  // ── Init: detect CLI tools, hydrate from DB, restore project ──────
  useEffect(() => {
    const init = async () => {
      // 1. CLI detection (non-blocking)
      invoke<CliTool[]>("detect_cli_tools")
        .then(setCliTools)
        .catch(() => {});
      invoke<string>("detect_default_shell")
        .then(setDefaultShell)
        .catch(() => {});

      // 2. Request notification permission
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }

      // 3. Hydrate settings & projects from SQLite (await to prevent race)
      try {
        await useAppStore.getState().loadSettingsFromDB?.();
      } catch {
        // DB not ready — defaults used
      }
      try {
        await useAppStore.getState().loadProjectFromDB?.();
      } catch {
        // DB not ready — defaults used
      }

      // 4. Restore last project (DB first → localStorage fallback)
      let lastPath: string | null = null;
      try {
        lastPath = await db.settings.get("lastProjectPath");
      } catch {
        // DB not ready
      }
      if (!lastPath) {
        lastPath = localStorage.getItem("kodiq-project-path");
      }
      if (lastPath) {
        openProject(lastPath);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Port detection ────────────────────────────────────────────────────
  useEffect(() => {
    const unlisten = listen<{ id: string; port: number; url: string }>("port-detected", (event) => {
      setPreviewUrl(event.payload.url);
      const { previewOpen, setPreviewOpen, settings } = useAppStore.getState();
      if (settings.autoOpenPreview !== false && !previewOpen) {
        setPreviewOpen(true);
      }
      toast.success(t("devServerDetected"), {
        description: `localhost:${event.payload.port}`,
      });
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setPreviewUrl]);

  // ── Update dialog listener (from toast action) ──────────────────────
  useEffect(() => {
    const handler = () => setUpdateDialogOpen(true);
    window.addEventListener("kodiq:open-update-dialog", handler);
    return () => window.removeEventListener("kodiq:open-update-dialog", handler);
  }, []);

  // ─── Layout ─────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen w-screen flex-col bg-[var(--bg-base)]">
      {/* Modals */}
      <CommandPalette
        onSpawnTab={spawnTab}
        onOpenFolder={handleOpenFolder}
        onCloseProject={closeProject}
      />
      <SettingsDialog />
      <UpdateDialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen} />
      <FileSearch />

      {/* Title bar */}
      <header
        className="flex h-[52px] shrink-0 items-center border-b border-white/[0.06] px-4 select-none"
        data-tauri-drag-region
      >
        <div className="w-[80px] shrink-0" />
        <div className="flex flex-1 items-center justify-center" data-tauri-drag-region>
          <ProjectSwitcher
            projectName={projectName}
            projectPath={projectPath}
            recentProjects={recentProjects}
            onOpenProject={openProject}
            onOpenFolder={handleOpenFolder}
            onCloseProject={closeProject}
          />
        </div>
        <div className="flex w-[140px] items-center justify-end gap-1">
          <UpdateBadge onClick={() => setUpdateDialogOpen(true)} />
          {projectPath && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={togglePreview}
                  className={cn(
                    "text-[#52525c] hover:text-[#a1a1aa]",
                    previewOpen && "text-[#a1a1aa]",
                  )}
                >
                  {previewOpen ? (
                    <PanelRightClose className="size-3.5" />
                  ) : (
                    <PanelRightOpen className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {previewOpen ? t("hidePreviewShort") : t("showPreviewShort")}
              </TooltipContent>
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
        {projectPath && (
          <>
            {/* Panels */}
            <div
              ref={panelsRef}
              className="flex flex-1 overflow-hidden"
              style={{ cursor: isDragging ? "col-resize" : undefined }}
            >
              {/* Terminal panel */}
              <div
                className="relative flex overflow-hidden"
                style={{ width: previewOpen ? `${splitRatio * 100}%` : "100%" }}
              >
                <ErrorBoundary name="terminal" fallbackTitle={t("terminalError")}>
                  <TabBar onSpawnTab={spawnTab} onCloseTab={closeTab} onReopenTab={reopenTab} />
                </ErrorBoundary>
                <FileViewer />
              </div>

              {/* Divider + Preview (only when open) */}
              {previewOpen && (
                <>
                  <div
                    className="group relative w-px shrink-0 cursor-col-resize"
                    onMouseDown={startDrag}
                  >
                    <div
                      className={cn(
                        "absolute inset-y-0 -left-[2px] w-[5px] transition-all",
                        isDragging
                          ? "bg-[#14b8a6]/30"
                          : "bg-transparent group-hover:bg-white/[0.04]",
                      )}
                    />
                    <div
                      className={cn(
                        "absolute inset-0 transition-colors",
                        isDragging ? "bg-[#14b8a6]" : "bg-white/[0.06]",
                      )}
                    />
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
        )}
        {!projectPath && !onboardingComplete && (
          <OnboardingWizard
            cliTools={cliTools}
            defaultShell={defaultShell}
            recentProjects={recentProjects}
            onComplete={(selectedPath) => {
              setOnboardingComplete(true);
              if (selectedPath) openProject(selectedPath);
            }}
            onOpenFolder={pickFolder}
          />
        )}
        {!projectPath && onboardingComplete && (
          <EmptyState onOpenFolder={handleOpenFolder} onOpenProject={openProject} />
        )}
      </div>
    </div>
  );
}
