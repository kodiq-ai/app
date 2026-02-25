import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { git as gitApi } from "@shared/lib/tauri";
import type { ProjectStats, GitInfo } from "@shared/lib/types";
import {
  GitBranch,
  GitCommit,
  ArrowUp,
  ArrowDown,
  FileText,
  Folder,
  HardDrive,
  Layers,
  CircleDot,
  Plus,
  Minus,
  FileQuestion,
  Pencil,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { t } from "@/lib/i18n";

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const EXT_COLORS: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#3178c6",
  js: "#f7df1e",
  jsx: "#f7df1e",
  css: "#a855f7",
  scss: "#cd6799",
  html: "#e34f26",
  json: "#a1a1a8",
  rs: "#dea584",
  py: "#3776ab",
  go: "#00add8",
  md: "#6e6e76",
  toml: "#9c4221",
  yaml: "#cb171e",
  yml: "#cb171e",
  svg: "#ffb13b",
  png: "#a3e635",
  jpg: "#a3e635",
  lock: "#303036",
};

const KIND_CONFIG: Record<string, { icon: typeof Pencil; color: string; label: string }> = {
  modified: { icon: Pencil, color: "#eab308", label: "gitModified" },
  added: { icon: Plus, color: "#22c55e", label: "gitAdded" },
  deleted: { icon: Minus, color: "#ef4444", label: "gitDeleted" },
  untracked: { icon: FileQuestion, color: "#a1a1a8", label: "gitUntracked" },
  other: { icon: CircleDot, color: "#a1a1a8", label: "gitModified" },
};

// ── Component ────────────────────────────────────────────────────────────────

export function ProjectOverview() {
  const projectPath = useAppStore((s) => s.projectPath);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [git, setGit] = useState<GitInfo | null>(null);

  useEffect(() => {
    if (!projectPath) return;

    const refreshGit = () => {
      gitApi
        .getInfo(projectPath)
        .then(setGit)
        .catch((e) => console.error("[ProjectOverview]", e));
    };

    gitApi
      .getStats(projectPath)
      .then(setStats)
      .catch((e) => console.error("[ProjectOverview]", e));
    refreshGit();

    // Refresh git on native filesystem events (replaces 10s polling)
    const unlisten = listen<string>("git-changed", refreshGit);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [projectPath]);

  if (!stats && !git) return null;

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-3 px-2.5 py-2">
          {/* ── Git Section ───────────────────────────────────────── */}
          {git?.isGit && (
            <div className="flex flex-col gap-1.5">
              {/* Branch */}
              <div className="flex items-center gap-1.5">
                <GitBranch className="text-k-accent size-3 shrink-0" />
                <span className="text-k-text truncate text-[11px] font-medium">{git.branch}</span>
                {(git.ahead ?? 0) > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-0.5 text-[9px] text-[#22c55e]">
                        <ArrowUp className="size-2.5" />
                        {git.ahead}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      {git.ahead} {t("gitAhead")}
                    </TooltipContent>
                  </Tooltip>
                )}
                {(git.behind ?? 0) > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-0.5 text-[9px] text-[#ef4444]">
                        <ArrowDown className="size-2.5" />
                        {git.behind}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      {git.behind} {t("gitBehind")}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Last commit */}
              {git.commitHash && (
                <div className="flex items-center gap-1.5 pl-[18px]">
                  <GitCommit className="text-k-border size-2.5 shrink-0" />
                  <span className="text-k-text-tertiary truncate font-mono text-[10px]">
                    {git.commitHash}
                  </span>
                  <span className="text-k-border flex-1 truncate text-[10px]">
                    {git.commitMessage}
                  </span>
                </div>
              )}

              {/* Changed files */}
              {git.changedFiles && git.changedFiles.length > 0 ? (
                <div className="mt-0.5 flex flex-col gap-0.5 pl-[18px]">
                  <span className="text-k-text-tertiary text-[10px] font-medium">
                    {t("gitChanges")} ({git.changedCount})
                  </span>
                  {git.changedFiles.slice(0, 8).map((f) => {
                    const fallback = { icon: CircleDot, color: "#a1a1a8", label: "gitModified" };
                    const cfg = KIND_CONFIG[f.kind] ?? fallback;
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
                  {(git.changedCount ?? 0) > 8 && (
                    <span className="text-k-border text-[10px]">
                      +{(git.changedCount ?? 0) - 8} ещё…
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-k-border pl-[18px] text-[10px]">{t("gitNoChanges")}</span>
              )}
            </div>
          )}

          {/* ── Separator ─────────────────────────────────────────── */}
          {git?.isGit && stats && <Separator className="bg-white/[0.04]" />}

          {/* ── Project Stats ─────────────────────────────────────── */}
          {stats && (
            <div className="flex flex-col gap-1.5">
              {/* Counts row */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <FileText className="text-k-text-tertiary size-2.5" />
                  <span className="text-k-text-secondary text-[10px]">
                    {stats.totalFiles} {t("filesCount")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Folder className="text-k-text-tertiary size-2.5" />
                  <span className="text-k-text-secondary text-[10px]">
                    {stats.totalDirs} {t("foldersCount")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <HardDrive className="text-k-text-tertiary size-2.5" />
                  <span className="text-k-text-secondary text-[10px]">
                    {formatSize(stats.totalSizeBytes)}
                  </span>
                </div>
              </div>

              {/* Stack badges */}
              {stats.stack.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <Layers className="text-k-text-tertiary size-2.5 shrink-0" />
                  {stats.stack.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="text-k-text-secondary h-4 border-0 bg-white/[0.04] px-1.5 text-[9px] font-medium"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Extension bars */}
              {stats.extensions.length > 0 && (
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {stats.extensions.slice(0, 6).map((e) => {
                    const maxCount = stats.extensions[0]?.count ?? 1;
                    const pct = Math.max(8, (e.count / maxCount) * 100);
                    const color = EXT_COLORS[e.ext] || "#6e6e76";
                    return (
                      <div key={e.ext} className="flex h-4 items-center gap-1.5">
                        <span className="text-k-text-tertiary w-8 shrink-0 text-right font-mono text-[10px]">
                          .{e.ext}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.03]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}
                          />
                        </div>
                        <span className="text-k-border w-6 shrink-0 font-mono text-[10px]">
                          {e.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
