import { useState } from "react";
import { ChevronRight, ChevronDown, FolderOpen, Folder, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { KodiqDot } from "@/components/icons";
import { t } from "@/lib/i18n";
import type { RecentProject } from "@/lib/store";

interface ProjectSwitcherProps {
  projectName: string;
  projectPath: string | null;
  recentProjects: RecentProject[];
  onOpenProject: (path: string) => void;
  onOpenFolder: () => void;
  onCloseProject: () => void;
}

export function ProjectSwitcher({
  projectName,
  projectPath,
  recentProjects,
  onOpenProject,
  onOpenFolder,
  onCloseProject,
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-white/[0.04]">
          <KodiqDot size={16} />
          <span className="text-k-text-tertiary text-[12px] font-medium">Kodiq</span>
          <ChevronRight className="text-k-bg-elevated size-2.5" />
          <span className="text-k-text-secondary text-[12px] font-medium">
            {projectName || t("selectProject")}
          </span>
          <ChevronDown className="text-k-border ml-0.5 size-2.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="bg-k-bg-surface w-[280px] border-white/[0.06] p-0 shadow-xl"
        sideOffset={8}
        align="center"
      >
        {recentProjects.length > 0 && (
          <div className="px-1 pt-1">
            <div className="text-k-border px-2 py-1.5 text-[10px] font-medium tracking-[0.08em] uppercase">
              {t("recent")}
            </div>
            {recentProjects.map((p) => (
              <button
                key={p.path}
                onClick={() => {
                  onOpenProject(p.path);
                  setOpen(false);
                }}
                className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
              >
                <Folder className="fill-k-border text-k-border size-3 shrink-0" />
                <span className="text-k-text-secondary group-hover:text-k-text-secondary flex-1 truncate text-[12px] transition-colors">
                  {p.name}
                </span>
                {p.path === projectPath && (
                  <div className="bg-k-accent size-1.5 shrink-0 rounded-full" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mx-2 my-1 h-px bg-white/[0.06]" />

        <div className="px-1 pb-1">
          <button
            onClick={() => {
              onOpenFolder();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
          >
            <FolderOpen className="text-k-text-tertiary size-3" />
            <span className="text-k-text-secondary text-[12px]">{t("openProject")}...</span>
          </button>
          {projectPath && (
            <button
              onClick={() => {
                onCloseProject();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
            >
              <X className="text-k-text-tertiary size-3" />
              <span className="text-k-text-secondary text-[12px]">{t("closeProject")}</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
