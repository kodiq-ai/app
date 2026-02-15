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
        <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/[0.04] transition-colors">
          <KodiqDot size={16} />
          <span className="text-[12px] text-[#52525c] font-medium">Kodiq</span>
          <ChevronRight className="size-2.5 text-[#27272a]" />
          <span className="text-[12px] text-[#a1a1aa] font-medium">
            {projectName || t("selectProject")}
          </span>
          <ChevronDown className="size-2.5 text-[#3f3f46] ml-0.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0 bg-[#141517] border-white/[0.06] shadow-xl"
        sideOffset={8}
        align="center"
      >
        {recentProjects.length > 0 && (
          <div className="px-1 pt-1">
            <div className="text-[10px] text-[#3f3f46] font-medium uppercase tracking-[0.08em] px-2 py-1.5">
              {t("recent")}
            </div>
            {recentProjects.map((p) => (
              <button
                key={p.path}
                onClick={() => { onOpenProject(p.path); setOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-white/[0.04] group transition-colors"
              >
                <Folder className="size-3 fill-[#3f3f46] text-[#3f3f46] shrink-0" />
                <span className="text-[12px] text-[#71717a] group-hover:text-[#a1a1aa] truncate flex-1 transition-colors">
                  {p.name}
                </span>
                {p.path === projectPath && (
                  <div className="size-1.5 rounded-full bg-[#14b8a6] shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="h-px bg-white/[0.06] mx-2 my-1" />

        <div className="px-1 pb-1">
          <button
            onClick={() => { onOpenFolder(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.04] text-left transition-colors"
          >
            <FolderOpen className="size-3 text-[#52525c]" />
            <span className="text-[12px] text-[#a1a1aa]">{t("openProject")}...</span>
          </button>
          {projectPath && (
            <button
              onClick={() => { onCloseProject(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.04] text-left transition-colors"
            >
              <X className="size-3 text-[#52525c]" />
              <span className="text-[12px] text-[#71717a]">{t("closeProject")}</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
