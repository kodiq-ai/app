import { FolderOpen, Plus, ChevronRight, Folder, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
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
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-[320px] flex-col items-center gap-10 px-6">
        {/* Logo */}
        <div className="anim-1 animate-float">
          <KodiqIcon size={56} />
        </div>

        {/* Actions */}
        <div className="anim-2 flex w-full flex-col gap-2">
          <Button
            variant="ghost"
            onClick={onOpenFolder}
            className="group flex h-auto w-full items-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-3.5 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.03] active:scale-[0.995]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] text-[#71717a] transition-colors group-hover:text-[#a1a1aa]">
              <FolderOpen className="size-4" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[13px] font-medium text-[#e4e4e7]">{t("openProject")}</div>
              <div className="mt-0.5 text-[11px] text-[#52525c]">{t("selectFolder")}</div>
            </div>
            <ChevronRight className="size-3.5 text-[#3f3f46] transition-colors group-hover:text-[#52525c]" />
          </Button>

          <Button
            variant="ghost"
            disabled
            className="flex h-auto w-full items-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-3.5 opacity-45"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] text-[#71717a]">
              <Plus className="size-4" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[13px] font-medium text-[#e4e4e7]">{t("newProject")}</div>
              <div className="mt-0.5 text-[11px] text-[#52525c]">{t("createFromScratch")}</div>
            </div>
            <span className="text-[9px] font-medium tracking-wider text-[#3f3f46] uppercase">
              {t("comingSoon")}
            </span>
          </Button>
        </div>

        {/* Recent projects */}
        {recentProjects.length > 0 && (
          <div className="anim-3 w-full">
            <div className="mb-2 px-1 text-[10px] font-medium tracking-[0.08em] text-[#3f3f46] uppercase">
              {t("recent")}
            </div>
            <div className="flex flex-col gap-px">
              {recentProjects.map((p) => (
                <Button
                  key={p.path}
                  variant="ghost"
                  onClick={() => onOpenProject(p.path)}
                  className="group h-auto w-full justify-start gap-2.5 rounded-lg px-3 py-2 hover:bg-white/[0.025]"
                >
                  <Folder className="size-3 shrink-0 fill-[#3f3f46] text-[#3f3f46]" />
                  <span className="flex-1 truncate text-left text-[12px] text-[#71717a] transition-colors group-hover:text-[#a1a1aa]">
                    {p.name}
                  </span>
                  <span className="font-mono text-[10px] text-[#27272a] opacity-0 transition-opacity group-hover:opacity-100">
                    {p.path.replace(/\/[^/]+$/, "/")}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* AI tools */}
        <div className="anim-4 w-full">
          <div className="mb-2 px-1 text-[10px] font-medium tracking-[0.08em] text-[#3f3f46] uppercase">
            {t("aiTools")}
          </div>
          <div className="flex flex-col gap-px">
            {installedCli.map((tool) => (
              <div key={tool.name} className="flex items-center gap-2.5 rounded-lg px-3 py-2">
                <div
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full"
                  style={{ background: CLI_COLORS[tool.provider] }}
                >
                  <Check className="size-2 text-white" strokeWidth={3} />
                </div>
                <span className="flex-1 text-[12px] text-[#a1a1aa]">{tool.name}</span>
                <span className="font-mono text-[10px] text-[#3f3f46]">{tool.version}</span>
              </div>
            ))}
            {dimmedCli.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 opacity-30"
              >
                <div
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ background: CLI_COLORS[tool.provider] }}
                />
                <span className="flex-1 text-[12px] text-[#52525c]">{tool.name}</span>
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
        <div className="anim-5 text-[10px] text-[#27272a]">v0.1.0</div>
      </div>
    </div>
  );
}
