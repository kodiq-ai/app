import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { TabIconSvg } from "@/components/icons";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Star, TerminalSquare } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { db } from "@shared/lib/tauri";
import type { HistoryEntry } from "@shared/lib/types";

interface QuickLaunchProps {
  onSpawnTab: (command?: string, label?: string) => Promise<string | null>;
}

export function QuickLaunch({ onSpawnTab }: QuickLaunchProps) {
  const cliTools = useAppStore((s) => s.cliTools);
  const defaultCli = useAppStore((s) => s.defaultCli);
  const setDefaultCli = useAppStore((s) => s.setDefaultCli);
  const projectId = useAppStore((s) => s.projectId);
  const installedCli = cliTools.filter((tool) => tool.installed);

  const [recentCommands, setRecentCommands] = useState<HistoryEntry[]>([]);

  // Load recent commands when project changes
  useEffect(() => {
    if (!projectId) {
      setRecentCommands([]);
      return;
    }
    db.history
      .recent(projectId, 5)
      .then(setRecentCommands)
      .catch(() => setRecentCommands([]));
  }, [projectId]);

  if (installedCli.length === 0 && recentCommands.length === 0) {
    return null;
  }

  // Sort: default CLI first, then alphabetical
  const sorted = [...installedCli].sort((a, b) => {
    if (a.bin === defaultCli) {
      return -1;
    }
    if (b.bin === defaultCli) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });

  // Filter out recent commands that are just CLI names (already shown above)
  const cliBins = new Set(installedCli.map((tool) => tool.bin));
  const filteredRecent = recentCommands.filter((entry) => !cliBins.has(entry.command));

  return (
    <div className="shrink-0 border-t border-white/[0.06] px-1 py-1.5">
      {/* AI CLI tools */}
      {sorted.length > 0 && (
        <>
          <span className="mb-1 block px-1.5 text-[10px] font-medium tracking-wider text-[#52525c] uppercase">
            AI
          </span>
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
                        "h-7 justify-start gap-1.5 px-2 text-[11px] hover:bg-white/[0.02]",
                        isDefault
                          ? "text-[#06b6d4] hover:text-[#06b6d4]"
                          : "text-[#52525c] hover:text-[#a1a1aa]",
                      )}
                    >
                      <TabIconSvg icon={tool.bin} size={12} />
                      <span className="flex-1 truncate text-left">{tool.name}</span>
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
        </>
      )}

      {/* Recent commands */}
      {filteredRecent.length > 0 && (
        <>
          <span className="mt-2 mb-1 block px-1.5 text-[10px] font-medium tracking-wider text-[#52525c] uppercase">
            {t("recentCommands")}
          </span>
          <div className="flex flex-col gap-0.5">
            {filteredRecent.map((entry) => (
              <Button
                key={entry.id}
                variant="ghost"
                onClick={() => onSpawnTab(entry.command, entry.command)}
                className="h-7 justify-start gap-1.5 px-2 text-[11px] text-[#52525c] hover:bg-white/[0.02] hover:text-[#a1a1aa]"
              >
                <TerminalSquare className="size-3 shrink-0" />
                <span className="flex-1 truncate text-left font-mono">{entry.command}</span>
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
