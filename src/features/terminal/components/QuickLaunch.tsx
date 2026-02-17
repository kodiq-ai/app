import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { TabIconSvg } from "@/components/icons";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Star, TerminalSquare, Plus, Pencil, Trash2, Play } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { db } from "@shared/lib/tauri";
import type { HistoryEntry, LaunchConfig, LaunchConfigPayload } from "@shared/lib/types";
import { LaunchConfigDialog } from "@features/project/components/LaunchConfigDialog";
import { toast } from "sonner";

interface QuickLaunchProps {
  onSpawnTab: (
    command?: string,
    label?: string,
    env?: Record<string, string>,
  ) => Promise<string | null>;
}

export function QuickLaunch({ onSpawnTab }: QuickLaunchProps) {
  const cliTools = useAppStore((s) => s.cliTools);
  const defaultCli = useAppStore((s) => s.defaultCli);
  const setDefaultCli = useAppStore((s) => s.setDefaultCli);
  const projectId = useAppStore((s) => s.projectId);
  const launchConfigs = useAppStore((s) => s.launchConfigs);
  const removeLaunchConfig = useAppStore((s) => s.removeLaunchConfig);
  const setLastLaunchConfigId = useAppStore((s) => s.setLastLaunchConfigId);
  const installedCli = cliTools.filter((tool) => tool.installed);

  const [recentCommands, setRecentCommands] = useState<HistoryEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LaunchConfig | null>(null);

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

  // Load launch configs when project changes
  useEffect(() => {
    if (!projectId) return;
    useAppStore.getState().loadLaunchConfigs(projectId);
  }, [projectId]);

  const handleLaunchConfig = (config: LaunchConfig) => {
    try {
      const payload: LaunchConfigPayload = JSON.parse(config.config);
      const parts = [config.cli_name, ...payload.args];
      const command = parts.join(" ");
      setLastLaunchConfigId(config.id);
      const env = Object.keys(payload.env).length > 0 ? payload.env : undefined;
      onSpawnTab(command, config.profile_name, env);
    } catch {
      onSpawnTab(config.cli_name, config.profile_name);
    }
  };

  const handleDeleteConfig = async (config: LaunchConfig) => {
    try {
      await db.launchConfigs.delete(config.id);
      removeLaunchConfig(config.id);
      toast.success(t("launchConfigDeleted"));
    } catch (e) {
      toast.error(String(e));
    }
  };

  const openCreateDialog = () => {
    setEditingConfig(null);
    setDialogOpen(true);
  };

  const openEditDialog = (config: LaunchConfig) => {
    setEditingConfig(config);
    setDialogOpen(true);
  };

  if (installedCli.length === 0 && recentCommands.length === 0 && launchConfigs.length === 0) {
    return null;
  }

  // Sort: default CLI first, then alphabetical
  const sorted = [...installedCli].sort((a, b) => {
    if (a.bin === defaultCli) return -1;
    if (b.bin === defaultCli) return 1;
    return a.name.localeCompare(b.name);
  });

  // Filter out recent commands that are just CLI names
  const cliBins = new Set(installedCli.map((tool) => tool.bin));
  const filteredRecent = recentCommands.filter((entry) => !cliBins.has(entry.command));

  return (
    <>
      <div className="shrink-0 border-t border-white/[0.06] px-1 py-1.5">
        {/* AI CLI tools */}
        {sorted.length > 0 && (
          <>
            <span className="mb-1 block px-1.5 text-[10px] font-medium tracking-wider text-[#52525b] uppercase">
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
                            : "text-[#52525b] hover:text-[#a1a1aa]",
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

        {/* Launch Configs */}
        {launchConfigs.length > 0 && (
          <>
            <div className="mt-2 mb-1 flex items-center justify-between px-1.5">
              <span className="text-[10px] font-medium tracking-wider text-[#52525b] uppercase">
                {t("launchConfigs")}
              </span>
              <button
                onClick={openCreateDialog}
                className="flex size-4 items-center justify-center rounded text-[#52525b] transition-colors hover:bg-white/[0.04] hover:text-[#a1a1aa]"
              >
                <Plus className="size-2.5" />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {launchConfigs.map((config) => (
                <ContextMenu key={config.id}>
                  <ContextMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={() => handleLaunchConfig(config)}
                      className="h-7 justify-start gap-1.5 px-2 text-[11px] text-[#52525b] hover:bg-white/[0.02] hover:text-[#a1a1aa]"
                    >
                      <Play className="size-2.5 shrink-0 text-[#06b6d4]" />
                      <span className="flex-1 truncate text-left">{config.profile_name}</span>
                      <span className="truncate text-[9px] text-[#3f3f46]">{config.cli_name}</span>
                      {config.is_default && (
                        <Star className="size-2 shrink-0 fill-current text-[#06b6d4] opacity-60" />
                      )}
                    </Button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleLaunchConfig(config)}>
                      <Play className="mr-2 size-3" />
                      {t("run")}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => openEditDialog(config)}>
                      <Pencil className="mr-2 size-3" />
                      {t("editLaunchConfig")}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => handleDeleteConfig(config)}
                      className="text-red-400 focus:text-red-400"
                    >
                      <Trash2 className="mr-2 size-3" />
                      {t("deleteLaunchConfig")}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </>
        )}

        {/* New Config button (when no configs yet but CLIs exist) */}
        {launchConfigs.length === 0 && installedCli.length > 0 && (
          <div className="mt-1.5">
            <Button
              variant="ghost"
              onClick={openCreateDialog}
              className="h-7 w-full justify-start gap-1.5 px-2 text-[11px] text-[#3f3f46] hover:bg-white/[0.02] hover:text-[#71717a]"
            >
              <Plus className="size-2.5" />
              {t("newLaunchConfig")}
            </Button>
          </div>
        )}

        {/* Recent commands */}
        {filteredRecent.length > 0 && (
          <>
            <span className="mt-2 mb-1 block px-1.5 text-[10px] font-medium tracking-wider text-[#52525b] uppercase">
              {t("recentCommands")}
            </span>
            <div className="flex flex-col gap-0.5">
              {filteredRecent.map((entry) => (
                <Button
                  key={entry.id}
                  variant="ghost"
                  onClick={() => onSpawnTab(entry.command, entry.command)}
                  className="h-7 justify-start gap-1.5 px-2 text-[11px] text-[#52525b] hover:bg-white/[0.02] hover:text-[#a1a1aa]"
                >
                  <TerminalSquare className="size-3 shrink-0" />
                  <span className="flex-1 truncate text-left font-mono">{entry.command}</span>
                </Button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Launch Config Dialog */}
      <LaunchConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editConfig={editingConfig}
      />
    </>
  );
}
