import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { TabIconSvg } from "@/components/icons";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface QuickLaunchProps {
  onSpawnTab: (command?: string, label?: string) => Promise<string | null>;
}

export function QuickLaunch({ onSpawnTab }: QuickLaunchProps) {
  const cliTools = useAppStore((s) => s.cliTools);
  const defaultCli = useAppStore((s) => s.defaultCli);
  const setDefaultCli = useAppStore((s) => s.setDefaultCli);
  const installedCli = cliTools.filter((t) => t.installed);

  if (installedCli.length === 0) return null;

  // Sort: default CLI first, then alphabetical
  const sorted = [...installedCli].sort((a, b) => {
    if (a.bin === defaultCli) return -1;
    if (b.bin === defaultCli) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="border-t border-white/[0.06] px-1 py-1.5 shrink-0">
      <span className="text-[10px] text-[#52525c] font-medium uppercase tracking-wider px-1.5 mb-1 block">AI</span>
      <div className="flex flex-col gap-0.5">
        {sorted.map((tool) => {
          const isDefault = tool.bin === defaultCli;
          return (
            <ContextMenu key={tool.bin}>
              <ContextMenuTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => onSpawnTab(tool.bin, tool.name)}
                  className={cn(
                    "justify-start gap-1.5 h-7 px-2 text-[11px] hover:bg-white/[0.02]",
                    isDefault
                      ? "text-[#14b8a6] hover:text-[#14b8a6]"
                      : "text-[#52525c] hover:text-[#a1a1aa]"
                  )}
                >
                  <TabIconSvg icon={tool.bin} size={12} />
                  <span className="truncate flex-1 text-left">{tool.name}</span>
                  {isDefault && <Star className="size-2.5 fill-current opacity-60" />}
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                {isDefault ? (
                  <ContextMenuItem onClick={() => setDefaultCli(null)}>
                    {t("clearDefaultCli")}
                  </ContextMenuItem>
                ) : (
                  <ContextMenuItem onClick={() => setDefaultCli(tool.bin)}>
                    {t("setDefaultCli")}
                  </ContextMenuItem>
                )}
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    </div>
  );
}
