import { useCallback } from "react";
import { toast } from "sonner";
import { FolderOpen, BarChart3, ClipboardList, GitBranch } from "lucide-react";
import { fs } from "@shared/lib/tauri";
import { useAppStore, type FileEntry, type SidebarTab } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TreeItem } from "@/components/TreeItem";
import { ProjectOverview } from "@/components/ProjectOverview";
import { ActivityPanel } from "@features/activity/components/ActivityPanel";
import { GitPanel } from "@features/git/components/GitPanel";
import { Loader } from "@/components/Loader";
import { t } from "@/lib/i18n";

// ── Activity Bar Icon ────────────────────────────────────────────────────────

function ActivityIcon({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof FolderOpen;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClick}
          className={cn(
            "relative size-7",
            active ? "text-k-text" : "text-k-text-tertiary hover:text-k-text-secondary",
          )}
        >
          {active && (
            <div className="bg-k-accent absolute top-1.5 bottom-1.5 left-0 w-[2px] rounded-r" />
          )}
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}

// ── Activity Bar ─────────────────────────────────────────────────────────────

export function ActivityBar() {
  const projectName = useAppStore((s) => s.projectName);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const sidebarTab = useAppStore((s) => s.sidebarTab);
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);
  const fileTree = useAppStore((s) => s.fileTree);

  const expandDir = useCallback(async (path: string): Promise<FileEntry[]> => {
    try {
      return (await fs.readDir(path)) as FileEntry[];
    } catch (e) {
      toast.error(t("failedToReadDir"), { description: String(e) });
      return [];
    }
  }, []);

  const handleIconClick = (tab: SidebarTab) => {
    if (sidebarOpen && sidebarTab === tab) {
      // Clicking active tab — collapse panel
      setSidebarOpen(false);
    } else {
      // Open panel on this tab
      setSidebarTab(tab);
      setSidebarOpen(true);
    }
  };

  return (
    <div className="flex shrink-0">
      {/* Panel (slides in/out) */}
      <div
        className={cn(
          "flex flex-col overflow-hidden border-l border-white/[0.06]",
          "motion-safe:transition-[width,opacity] motion-safe:duration-200 motion-safe:ease-out",
          sidebarOpen ? "w-52 opacity-100" : "w-0 opacity-0",
        )}
      >
        {/* Panel header */}
        <div className="flex h-9 min-w-[13rem] shrink-0 items-center px-2.5">
          <span className="text-k-text-secondary flex-1 truncate text-[11px] font-medium tracking-wider uppercase">
            {sidebarTab === "files" && projectName}
            {sidebarTab === "activity" && t("activityLog")}
            {sidebarTab === "project" && t("projectInfo")}
            {sidebarTab === "git" && t("gitSourceControl")}
          </span>
        </div>

        {/* Panel content */}
        <div className="min-w-[13rem] flex-1 overflow-hidden">
          {sidebarTab === "files" && (
            <ScrollArea className="h-full">
              <div className="py-0.5">
                {fileTree.map((e) => (
                  <TreeItem key={e.path || e.name} entry={e} depth={0} onExpand={expandDir} />
                ))}
                {fileTree.length === 0 && (
                  <div className="flex items-center gap-2 px-3 py-4">
                    <Loader size="sm" />
                    <span className="text-k-border text-[11px]">{t("loading")}</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          {sidebarTab === "activity" && <ActivityPanel />}
          {sidebarTab === "project" && <ProjectOverview />}
          {sidebarTab === "git" && <GitPanel />}
        </div>
      </div>

      {/* Activity Bar — always visible */}
      <div className="flex w-10 shrink-0 flex-col items-center gap-0.5 border-l border-white/[0.06] pt-1">
        <ActivityIcon
          icon={FolderOpen}
          label={t("files")}
          active={sidebarOpen && sidebarTab === "files"}
          onClick={() => handleIconClick("files")}
        />
        <ActivityIcon
          icon={GitBranch}
          label={t("gitSourceControl")}
          active={sidebarOpen && sidebarTab === "git"}
          onClick={() => handleIconClick("git")}
        />
        <ActivityIcon
          icon={BarChart3}
          label={t("projectInfo")}
          active={sidebarOpen && sidebarTab === "project"}
          onClick={() => handleIconClick("project")}
        />
        <ActivityIcon
          icon={ClipboardList}
          label={t("activityLog")}
          active={sidebarOpen && sidebarTab === "activity"}
          onClick={() => handleIconClick("activity")}
        />
      </div>
    </div>
  );
}
