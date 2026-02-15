import { FolderOpen, Plus, ChevronRight, Folder, Check } from "lucide-react";
import { useAppStore, type RecentProject } from "@/lib/store";
import { CLI_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { KodiqIcon } from "@/components/icons";
import { t } from "@/lib/i18n";

interface EmptyStateProps {
  onOpenFolder: () => void;
  onOpenProject: (path: string) => void;
}

export function EmptyState({ onOpenFolder, onOpenProject }: EmptyStateProps) {
  const recentProjects = useAppStore((s) => s.recentProjects);
  const cliTools = useAppStore((s) => s.cliTools);

  const installedCli = cliTools.filter((tool) => tool.installed);
  const dimmedCli = cliTools.filter((tool) => !tool.installed);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-10 max-w-[320px] w-full px-6">
        {/* Logo */}
        <div className="anim-1 animate-float">
          <KodiqIcon size={56} />
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-2 anim-2">
          <Button
            variant="ghost"
            onClick={onOpenFolder}
            className="w-full h-auto flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all duration-200 group active:scale-[0.995]"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-[#71717a] group-hover:text-[#a1a1aa] transition-colors">
              <FolderOpen className="size-4" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[13px] text-[#e4e4e7] font-medium">{t("openProject")}</div>
              <div className="text-[11px] text-[#52525c] mt-0.5">{t("selectFolder")}</div>
            </div>
            <ChevronRight className="size-3.5 text-[#3f3f46] group-hover:text-[#52525c] transition-colors" />
          </Button>

          <Button
            variant="ghost"
            disabled
            className="w-full h-auto flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.01] opacity-45"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-[#71717a]">
              <Plus className="size-4" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[13px] text-[#e4e4e7] font-medium">{t("newProject")}</div>
              <div className="text-[11px] text-[#52525c] mt-0.5">{t("createFromScratch")}</div>
            </div>
            <span className="text-[9px] text-[#3f3f46] font-medium uppercase tracking-wider">{t("comingSoon")}</span>
          </Button>
        </div>

        {/* Recent projects */}
        {recentProjects.length > 0 && (
          <div className="w-full anim-3">
            <div className="text-[10px] text-[#3f3f46] font-medium uppercase tracking-[0.08em] px-1 mb-2">{t("recent")}</div>
            <div className="flex flex-col gap-px">
              {recentProjects.map((p) => (
                <Button
                  key={p.path}
                  variant="ghost"
                  onClick={() => onOpenProject(p.path)}
                  className="w-full justify-start gap-2.5 h-auto px-3 py-2 rounded-lg hover:bg-white/[0.025] group"
                >
                  <Folder className="size-3 fill-[#3f3f46] text-[#3f3f46] shrink-0" />
                  <span className="text-[12px] text-[#71717a] group-hover:text-[#a1a1aa] truncate flex-1 text-left transition-colors">{p.name}</span>
                  <span className="text-[10px] text-[#27272a] font-mono opacity-0 group-hover:opacity-100 transition-opacity">{p.path.replace(/\/[^/]+$/, "/")}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* AI tools */}
        <div className="w-full anim-4">
          <div className="text-[10px] text-[#3f3f46] font-medium uppercase tracking-[0.08em] px-1 mb-2">{t("aiTools")}</div>
          <div className="flex flex-col gap-px">
            {installedCli.map((tool) => (
              <div key={tool.name} className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0" style={{ background: CLI_COLORS[tool.provider] }}>
                  <Check className="size-2 text-white" strokeWidth={3} />
                </div>
                <span className="text-[12px] text-[#a1a1aa] flex-1">{tool.name}</span>
                <span className="text-[10px] text-[#3f3f46] font-mono">{tool.version}</span>
              </div>
            ))}
            {dimmedCli.map((tool) => (
              <div key={tool.name} className="flex items-center gap-2.5 px-3 py-2 rounded-lg opacity-30">
                <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: CLI_COLORS[tool.provider] }} />
                <span className="text-[12px] text-[#52525c] flex-1">{tool.name}</span>
              </div>
            ))}
            {cliTools.length === 0 && (
              <div className="flex items-center gap-2.5 px-3 py-2 text-[11px] text-[#3f3f46]">
                {t("searchingTools")}
              </div>
            )}
          </div>
        </div>

        {/* Version */}
        <div className="text-[10px] text-[#27272a] anim-5">v0.1.0</div>
      </div>
    </div>
  );
}
