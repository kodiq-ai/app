import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { FolderOpen, BarChart3 } from "lucide-react";
import { useAppStore, type FileEntry, type SidebarTab } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TreeItem } from "@/components/TreeItem";
import { ProjectOverview } from "@/components/ProjectOverview";
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
            "size-7 relative",
            active
              ? "text-[#e4e4e7]"
              : "text-[#52525c] hover:text-[#a1a1aa]"
          )}
        >
          {active && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-[#14b8a6]" />
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
      return await invoke<FileEntry[]>("read_dir", { path });
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
      {/* Panel (slides out left of activity bar) */}
      {sidebarOpen && (
        <div className="flex flex-col w-52 border-l border-white/[0.06] overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center h-9 px-2.5 shrink-0">
            <span className="text-[11px] text-[#71717a] font-medium truncate flex-1 uppercase tracking-wider">
              {sidebarTab === "files" ? projectName : t("projectInfo")}
            </span>
          </div>

          {/* Panel content */}
          {sidebarTab === "files" ? (
            <ScrollArea className="flex-1">
              <div className="py-0.5">
                {fileTree.map((e) => (
                  <TreeItem key={e.path || e.name} entry={e} depth={0} onExpand={expandDir} />
                ))}
                {fileTree.length === 0 && (
                  <div className="px-3 py-4 text-[11px] text-[#3f3f46]">{t("loading")}</div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <ProjectOverview />
          )}
        </div>
      )}

      {/* Activity Bar — always visible */}
      <div className="flex flex-col items-center w-10 border-l border-white/[0.06] shrink-0 pt-1 gap-0.5">
        <ActivityIcon
          icon={FolderOpen}
          label={t("files")}
          active={sidebarOpen && sidebarTab === "files"}
          onClick={() => handleIconClick("files")}
        />
        <ActivityIcon
          icon={BarChart3}
          label={t("projectInfo")}
          active={sidebarOpen && sidebarTab === "project"}
          onClick={() => handleIconClick("project")}
        />
      </div>
    </div>
  );
}
