// ── Activity Panel ───────────────────────────────────────────────────────────
// Sidebar panel showing session activity: commands run, files changed.

import { useEffect, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { TerminalSquare, FileEdit, Plus, Minus, FileQuestion, RefreshCw } from "lucide-react";
import { git } from "@shared/lib/tauri";
import type { ChangedFile } from "@shared/lib/types";
import { useAppStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

const KIND_ICONS: Record<string, { icon: typeof FileEdit; color: string }> = {
  modified: { icon: FileEdit, color: "#eab308" },
  added: { icon: Plus, color: "#22c55e" },
  deleted: { icon: Minus, color: "#ef4444" },
  untracked: { icon: FileQuestion, color: "#a1a1a8" },
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export function ActivityPanel() {
  const projectPath = useAppStore((s) => s.projectPath);
  const activityLog = useAppStore((s) => s.activityLog);
  const sessionStartFiles = useAppStore((s) => s.sessionStartFiles);
  const sidebarTab = useAppStore((s) => s.sidebarTab);

  const [fileChanges, setFileChanges] = useState<ChangedFile[]>([]);

  const refreshGit = useCallback(() => {
    if (!projectPath) return;
    git
      .getInfo(projectPath)
      .then((info) => {
        if (!info.isGit || !info.changedFiles) {
          setFileChanges([]);
          return;
        }
        // Filter out files that were already changed at session start
        const startSet = new Set(sessionStartFiles);
        const newChanges = info.changedFiles.filter((f) => !startSet.has(f.file));
        setFileChanges(newChanges);
      })
      .catch(() => setFileChanges([]));
  }, [projectPath, sessionStartFiles]);

  // Refresh git on native filesystem events (replaces 10s polling)
  useEffect(() => {
    if (sidebarTab !== "activity" || !projectPath) return;
    refreshGit();
    const unlisten = listen<string>("git-changed", refreshGit);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [sidebarTab, projectPath, refreshGit]);

  const hasContent = activityLog.length > 0 || fileChanges.length > 0;

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-2 px-2.5 py-2">
          {/* Refresh button */}
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={refreshGit}
              aria-label="refresh activity"
              className="text-k-text-tertiary hover:text-k-text-secondary size-5"
            >
              <RefreshCw className="size-2.5" />
            </Button>
          </div>

          {!hasContent && (
            <div className="flex flex-col items-center gap-1 py-6">
              <span className="text-k-border text-[11px]">{t("noActivityYet")}</span>
            </div>
          )}

          {/* Commands run */}
          {activityLog.filter((e) => e.type === "command").length > 0 && (
            <div className="flex flex-col gap-0.5">
              <span className="text-k-text-tertiary text-[10px] font-medium tracking-wider uppercase">
                {t("commandRun")}
              </span>
              {activityLog
                .filter((e) => e.type === "command")
                .map((entry) => (
                  <div key={entry.id} className="flex h-5 items-center gap-1.5">
                    <TerminalSquare className="text-k-accent size-2.5 shrink-0" />
                    <span className="text-k-text-secondary flex-1 truncate font-mono text-[10px]">
                      {entry.label}
                    </span>
                    <span className="text-k-border shrink-0 text-[9px] tabular-nums">
                      {timeAgo(entry.timestamp)}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* File changes since session start */}
          {fileChanges.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <span className="text-k-text-tertiary text-[10px] font-medium tracking-wider uppercase">
                {t("fileChanged")} ({fileChanges.length})
              </span>
              {fileChanges.slice(0, 20).map((f) => {
                const fallback = { icon: FileEdit, color: "#eab308" };
                const cfg = KIND_ICONS[f.kind] ?? fallback;
                const Icon = cfg.icon;
                return (
                  <div key={f.file} className="flex h-5 items-center gap-1.5">
                    <Icon className="size-2.5 shrink-0" style={{ color: cfg.color }} />
                    <span className="text-k-text-secondary truncate font-mono text-[10px]">
                      {f.file}
                    </span>
                  </div>
                );
              })}
              {fileChanges.length > 20 && (
                <span className="text-k-border text-[10px]">+{fileChanges.length - 20}...</span>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
