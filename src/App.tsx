import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

import { toast } from "sonner";
import { useAppStore, type FileEntry } from "@/lib/store";
import type { GitInfo, ConsoleLevel, NetworkEvent } from "@shared/lib/types";
import { terminal, fs, git, cli, db, ssh } from "@shared/lib/tauri";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { KodiqLogo } from "@/components/icons";

import { useSplitDrag } from "@/hooks/useSplitDrag";
import { useVerticalSplit } from "@/hooks/useVerticalSplit";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommandPalette } from "@/components/CommandPalette";
import { ActivityBar } from "@/components/ActivityBar";
import { TabBar } from "@/components/TabBar";
import { ActivePanel } from "@/components/ActivePanel";
import { SettingsDialog } from "@/components/SettingsDialog";
import { FileSearch } from "@/components/FileSearch";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { EmptyState } from "@/components/EmptyState";
import { EditorPanel, destroyAllEditorViews } from "@features/editor";
import { OnboardingWizard } from "@features/settings/components/OnboardingWizard";
import { UpdateBadge } from "@features/settings/components/UpdateBadge";
import { UpdateDialog } from "@features/settings/components/UpdateDialog";
import { SshStatusBadge, SshPasswordPrompt } from "@features/ssh";

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
  const editorTabs = useAppStore((s) => s.editorTabs);
  const editorSplitRatio = useAppStore((s) => s.editorSplitRatio);

  const [defaultShell, setDefaultShell] = useState("");
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const { panelsRef, isDragging, startDrag } = useSplitDrag();
  const {
    containerRef: verticalRef,
    isDragging: isVDragging,
    startDrag: startVDrag,
  } = useVerticalSplit();

  const hasEditorTabs = editorTabs.length > 0;

  // ── Helpers ────────────────────────────────────────────────────────────

  const loadFileTree = async (path: string, connectionId?: string | null) => {
    try {
      const entries = await fs.readDir(path, connectionId);
      setFileTree(entries as FileEntry[]);
    } catch (e) {
      toast.error(t("failedToLoadFiles"), { description: String(e) });
    }
  };

  const spawnTab = useCallback(
    async (command?: string, label?: string, env?: Record<string, string>) => {
      try {
        const { projectPath, projectId, settings, tabs: currentTabs, activeConnectionId } =
          useAppStore.getState();

        let id: string;
        let connectionId: string | undefined;

        if (activeConnectionId) {
          // Spawn remote SSH terminal
          id = await ssh.spawnTerminal(activeConnectionId);
          connectionId = activeConnectionId;
        } else {
          // Spawn local terminal
          id = await terminal.spawn({
            command: command || null,
            cwd: projectPath,
            shell: settings.shell || null,
            env: env && Object.keys(env).length > 0 ? env : null,
          });
        }

        const tabLabel = label || (command ? command : t("terminal"));
        addTab({ id, label: tabLabel, command: command || "shell", connectionId });
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
      // SSH terminals have id starting with "ssh-term-"
      if (id.startsWith("ssh-term-")) {
        ssh.closeTerminal(id).catch(() => {});
      } else {
        terminal.close(id).catch(() => {});
      }
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
    useAppStore.getState().closeAllEditorTabs();
    destroyAllEditorViews();
    addRecent({ name, path });
    loadFileTree(path);

    // Start native filesystem watcher
    fs.startWatching(path).catch((e) => console.warn("[Watcher] failed to start:", e));

    // Capture initial git state for activity log diff
    useAppStore.getState().clearActivity();
    git
      .getInfo(path)
      .then((info: GitInfo) => {
        const files = (info.changedFiles ?? []).map((f) => f.file);
        useAppStore.getState().setSessionStartFiles(files);
        useAppStore.getState().setGitInfo(info);
      })
      .catch(() => {});

    // Async init: DB project → auto-config → restore sessions (proper await chain)
    (async () => {
      try {
        const project = await db.projects.getOrCreate(name, path);

        // Auto-generate default launch configs for installed CLIs (first time only)
        try {
          const existing = await db.launchConfigs.list(project.id);
          if (existing.length === 0) {
            const installed = useAppStore.getState().cliTools.filter((t) => t.installed);
            for (const tool of installed) {
              await db.launchConfigs.create({
                cli_name: tool.bin,
                profile_name: tool.name,
                config: JSON.stringify({ args: [], env: {}, cwd: null, shell: null }),
                is_default: false,
                project_id: null, // global so they appear in all projects
              });
            }
            if (installed.length > 0) {
              await useAppStore.getState().loadLaunchConfigs(project.id);
            }
          }
        } catch (e) {
          console.error("[Auto-config]", e);
        }

        // Restore sessions from SQLite, fallback to default
        try {
          const saved = await db.sessions.list(project.id);
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
      } catch (e) {
        console.error("[openProject] init failed:", e);
        // Fallback: spawn plain terminal so user isn't stuck
        await spawnTab(undefined, t("terminal"));
      }
    })();
  };

  const closeProject = () => {
    const { projectId } = useAppStore.getState();
    tabs.forEach((tab) => terminal.close(tab.id).catch(() => {}));
    if (projectId) {
      db.sessions.closeAll(projectId).catch((e) => console.error("[DB] closeAll:", e));
    }
    fs.stopWatching().catch(() => {});
    clearTabs();
    setFileTree([]);
    setProject(null);
    setPreviewUrl(null);
    useAppStore.getState().closeAllEditorTabs();
    destroyAllEditorViews();
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
      cli
        .detectTools()
        .then(setCliTools)
        .catch(() => {});
      cli
        .detectShell()
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

  // ── Filesystem watcher events ─────────────────────────────────────────
  useEffect(() => {
    const unlistenFs = listen<string>("fs-changed", () => {
      const path = useAppStore.getState().projectPath;
      if (path) loadFileTree(path);
    });
    return () => {
      unlistenFs.then((fn) => fn());
    };
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

  // ── Server events (from preview::server) ───────────────────────────
  useEffect(() => {
    const unlistenReady = listen<{ id: string; port: number; url: string }>(
      "preview://server-ready",
      (event) => {
        const { id, port, url } = event.payload;
        const store = useAppStore.getState();
        store.setServerReady(id, port);
        if (store.settings.autoOpenPreview !== false && !store.previewOpen) {
          store.setPreviewOpen(true);
        }
        toast.success(t("devServerDetected"), { description: url });
      },
    );
    const unlistenExit = listen<{ id: string }>("preview://server-exit", (event) => {
      useAppStore.getState().setServerStopped(event.payload.id);
    });

    // DevTools console events (from preview::devtools WebSocket bridge)
    let consoleSeq = 0;
    const unlistenConsole = listen<{
      level: string;
      args: unknown[];
      timestamp: number;
      stack?: string;
    }>("preview://console", (event) => {
      const { level, args, timestamp, stack } = event.payload;
      useAppStore.getState().pushConsoleEntry({
        id: `console-${Date.now()}-${consoleSeq++}`,
        level: (["log", "info", "warn", "error", "debug"].includes(level)
          ? level
          : "log") as ConsoleLevel,
        args,
        timestamp,
        stack,
      });
    });

    // -- Network events from preview webview ──────────────────
    let networkSeq = 0;
    const unlistenNetwork = listen<NetworkEvent>("preview://network", (event) => {
      const { method, url, status, statusText, reqType, startTime, duration, responseSize, error } =
        event.payload;
      useAppStore.getState().pushNetworkEntry({
        id: `net-${Date.now()}-${networkSeq++}`,
        method,
        url,
        status,
        statusText,
        type: reqType as "fetch" | "xhr",
        startTime,
        duration,
        responseSize,
        error,
      });
    });

    return () => {
      unlistenReady.then((fn) => fn());
      unlistenExit.then((fn) => fn());
      unlistenConsole.then((fn) => fn());
      unlistenNetwork.then((fn) => fn());
    };
  }, []);

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
      <SshPasswordPrompt />

      {/* Title bar */}
      <header
        className="flex h-[52px] shrink-0 items-center border-b border-white/[0.06] px-4 select-none"
        data-tauri-drag-region
      >
        <div className="flex shrink-0 items-center pl-[80px]">
          <KodiqLogo height={18} className="text-k-text-tertiary" />
        </div>
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
        <div className="flex w-[180px] items-center justify-end gap-1">
          <SshStatusBadge />
          <UpdateBadge onClick={() => setUpdateDialogOpen(true)} />
          {projectPath && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePreview}
                  aria-label={previewOpen ? "hide preview" : "show preview"}
                  className={cn(
                    "border-k-border text-k-text-tertiary hover:text-k-text-secondary h-6 rounded-md px-2.5 text-xs font-medium",
                    previewOpen && "border-k-accent/40 text-k-accent",
                  )}
                >
                  {t("preview")}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {previewOpen ? t("hidePreviewShort") : t("showPreviewShort")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {projectPath && (
          <>
            {/* Main content area: vertical split (editor + terminal) | preview */}
            <div
              ref={panelsRef}
              className="flex flex-1 overflow-hidden"
              style={{ cursor: isDragging ? "col-resize" : undefined }}
            >
              {/* Left column: editor on top, terminal on bottom */}
              <div
                ref={verticalRef}
                className="flex flex-1 flex-col overflow-hidden"
                style={{
                  width: previewOpen ? `${splitRatio * 100}%` : "100%",
                  cursor: isVDragging ? "row-resize" : undefined,
                }}
              >
                {/* Editor panel (only when tabs are open) */}
                {hasEditorTabs && (
                  <div
                    className="shrink-0 overflow-hidden"
                    style={{ height: `${editorSplitRatio * 100}%` }}
                  >
                    <ErrorBoundary name="editor" fallbackTitle={t("editorError")}>
                      <EditorPanel />
                    </ErrorBoundary>
                  </div>
                )}

                {/* Horizontal row-resize divider (only when editor is open) */}
                {hasEditorTabs && (
                  <div
                    className="group relative h-px shrink-0 cursor-row-resize"
                    onMouseDown={startVDrag}
                  >
                    <div
                      className={cn(
                        "absolute inset-x-0 -top-[2px] h-[5px] transition-all",
                        isVDragging
                          ? "bg-k-accent/30"
                          : "bg-transparent group-hover:bg-white/[0.04]",
                      )}
                    />
                    <div
                      className={cn(
                        "absolute inset-0 transition-colors",
                        isVDragging ? "bg-k-accent" : "bg-white/[0.06]",
                      )}
                    />
                  </div>
                )}

                {/* Terminal panel */}
                <div className="relative flex flex-1 overflow-hidden">
                  <ErrorBoundary name="terminal" fallbackTitle={t("terminalError")}>
                    <TabBar onSpawnTab={spawnTab} onCloseTab={closeTab} onReopenTab={reopenTab} />
                  </ErrorBoundary>
                </div>
              </div>

              {/* Vertical col-resize divider + Preview (only when open) */}
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
                          ? "bg-k-accent/30"
                          : "bg-transparent group-hover:bg-white/[0.04]",
                      )}
                    />
                    <div
                      className={cn(
                        "absolute inset-0 transition-colors",
                        isDragging ? "bg-k-accent" : "bg-white/[0.06]",
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
