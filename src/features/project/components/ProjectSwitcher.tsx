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
          <span className="text-[12px] font-medium text-[#6E6E76]">Kodiq</span>
          <ChevronRight className="size-2.5 text-[#202024]" />
          <span className="text-[12px] font-medium text-[#A1A1A8]">
            {projectName || t("selectProject")}
          </span>
          <ChevronDown className="ml-0.5 size-2.5 text-[#6E6E76]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] border-white/[0.06] bg-[#1A1A1D] p-0 shadow-xl"
        sideOffset={8}
        align="center"
      >
        {recentProjects.length > 0 && (
          <div className="px-1 pt-1">
            <div className="px-2 py-1.5 text-[10px] font-medium tracking-[0.08em] text-[#6E6E76] uppercase">
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
                <Folder className="size-3 shrink-0 fill-[#6E6E76] text-[#6E6E76]" />
                <span className="flex-1 truncate text-[12px] text-[#A1A1A8] transition-colors group-hover:text-[#A1A1A8]">
                  {p.name}
                </span>
                {p.path === projectPath && (
                  <div className="size-1.5 shrink-0 rounded-full bg-[#4DA3C7]" />
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
            <FolderOpen className="size-3 text-[#6E6E76]" />
            <span className="text-[12px] text-[#A1A1A8]">{t("openProject")}...</span>
          </button>
          {projectPath && (
            <button
              onClick={() => {
                onCloseProject();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
            >
              <X className="size-3 text-[#6E6E76]" />
              <span className="text-[12px] text-[#A1A1A8]">{t("closeProject")}</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
