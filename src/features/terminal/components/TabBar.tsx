import { useState, useRef, useCallback, useMemo } from "react";
import { Plus, X, TerminalSquare, Search } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TabIconSvg } from "@/components/icons";
import { XtermPanel } from "@/components/XtermPanel";
import { t } from "@/lib/i18n";

interface TabBarProps {
  onSpawnTab: (command?: string, label?: string) => Promise<string | null>;
  onCloseTab: (id: string) => void;
}

export function TabBar({ onSpawnTab, onCloseTab }: TabBarProps) {
  const tabs = useAppStore((s) => s.tabs);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const exitedTabs = useAppStore((s) => s.exitedTabs);
  const notifiedTabs = useAppStore((s) => s.notifiedTabs);
  const renameTab = useAppStore((s) => s.renameTab);
  const reorderTabs = useAppStore((s) => s.reorderTabs);
  const cliTools = useAppStore((s) => s.cliTools);
  const installedCli = useMemo(() => cliTools.filter((t) => t.installed), [cliTools]);

  // ── New terminal popover ──────────────────────────────────────────
  const [newTermOpen, setNewTermOpen] = useState(false);

  // ── Search filter ───────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const filteredTabs = useMemo(
    () => search ? tabs.filter((tb) => tb.label.toLowerCase().includes(search.toLowerCase())) : tabs,
    [tabs, search]
  );

  // ── Inline rename ────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startRename = (id: string, currentLabel: string) => {
    setEditingId(id);
    setEditValue(currentLabel);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      renameTab(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  // ── Drag & drop ──────────────────────────────────────────────────────
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    dragIndexRef.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(idx);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const fromIdx = dragIndexRef.current;
    if (fromIdx !== null && fromIdx !== toIdx) {
      reorderTabs(fromIdx, toIdx);
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, [reorderTabs]);

  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  // ── Tab actions ──────────────────────────────────────────────────────
  const closeOtherTabs = (keepId: string) => {
    tabs.forEach((tb) => {
      if (tb.id !== keepId) onCloseTab(tb.id);
    });
  };

  const closeTabsToRight = (fromId: string) => {
    const idx = tabs.findIndex((tb) => tb.id === fromId);
    if (idx === -1) return;
    tabs.slice(idx + 1).forEach((tb) => onCloseTab(tb.id));
  };

  return (
    <div className="relative overflow-hidden flex flex-1" style={{ background: "#0a0a0c" }}>
      {/* Vertical tab sidebar — left */}
      <div className="flex flex-col w-44 shrink-0 border-r border-white/[0.06] overflow-hidden">
        {/* New terminal button with tool picker */}
        <div className="px-2 pt-2 pb-1 shrink-0">
          <Popover open={newTermOpen} onOpenChange={setNewTermOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-8 px-2.5 text-[11px] rounded-lg border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/[0.1] text-[#71717a] hover:text-[#a1a1aa] transition-all"
              >
                <Plus className="size-3" />
                <span>{t("newTerminal")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[200px] p-1 bg-[#141517] border-white/[0.06] shadow-xl"
              side="right"
              sideOffset={8}
              align="start"
            >
              {/* Shell */}
              <button
                onClick={() => { onSpawnTab(undefined, t("terminal")); setNewTermOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-white/[0.04] transition-colors"
              >
                <TabIconSvg icon="shell" size={14} />
                <span className="text-[12px] text-[#a1a1aa]">{t("terminal")}</span>
              </button>

              {/* AI tools */}
              {installedCli.length > 0 && (
                <>
                  <div className="h-px bg-white/[0.06] mx-1 my-1" />
                  {installedCli.map((tool) => (
                    <button
                      key={tool.bin}
                      onClick={() => { onSpawnTab(tool.bin, tool.name); setNewTermOpen(false); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-white/[0.04] transition-colors"
                    >
                      <TabIconSvg icon={tool.bin} size={14} />
                      <span className="text-[12px] text-[#a1a1aa]">{tool.name}</span>
                    </button>
                  ))}
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Search */}
        {tabs.length > 1 && (
          <div className="px-2 pb-1 shrink-0">
            <div className="flex items-center gap-1.5 h-7 px-2 rounded-md bg-white/[0.02] border border-white/[0.04]">
              <Search className="size-3 text-[#3f3f46] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchTerminals")}
                className="flex-1 bg-transparent text-[11px] text-[#a1a1aa] placeholder:text-[#3f3f46] outline-none h-full min-w-0"
              />
            </div>
          </div>
        )}

        {/* Tab list */}
        <div className="flex-1 overflow-y-auto py-0.5">
          {filteredTabs.map((tab, idx) => (
            <ContextMenu key={tab.id}>
              <ContextMenuTrigger asChild>
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "relative",
                    dragOverIndex === idx && "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[#14b8a6]"
                  )}
                >
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab(tab.id)}
                    onDoubleClick={() => startRename(tab.id, tab.label)}
                    className={cn(
                      "group w-full justify-start gap-1.5 h-8 px-2.5 text-[11px] rounded-none",
                      activeTab === tab.id
                        ? "text-[#e4e4e7] bg-white/[0.04]"
                        : "text-[#52525c] hover:text-[#a1a1aa] hover:bg-white/[0.02]"
                    )}
                  >
                    <TabIconSvg icon={tab.command || "shell"} size={12} />
                    {editingId === tab.id ? (
                      <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent border-b border-[#14b8a6]/40 text-[11px] text-[#e4e4e7] outline-none px-0 py-0 h-auto min-w-0"
                        autoFocus
                      />
                    ) : (
                      <span className={cn("truncate flex-1 text-left", exitedTabs.has(tab.id) && "opacity-50")}>
                        {tab.label}
                      </span>
                    )}
                    {notifiedTabs.has(tab.id) ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] shrink-0 animate-pulse" title={t("processFinished")} />
                    ) : exitedTabs.has(tab.id) ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3f3f46] shrink-0" title={t("processExited")} />
                    ) : null}
                    <span
                      onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                      className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] text-[#52525c] hover:text-[#a1a1aa] transition-all cursor-pointer shrink-0"
                    >
                      <X className="size-2.5" />
                    </span>
                  </Button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => startRename(tab.id, tab.label)}>
                  {t("rename")}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onCloseTab(tab.id)}>
                  {t("close")}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => closeOtherTabs(tab.id)} disabled={tabs.length <= 1}>
                  {t("closeOthers")}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => closeTabsToRight(tab.id)} disabled={tabs.indexOf(tab) === tabs.length - 1}>
                  {t("closeToRight")}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onSpawnTab(undefined, t("terminal"))}>
                  {t("newTerminal")}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>

        {/* Empty state */}
        {tabs.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <Button
              variant="ghost"
              onClick={() => onSpawnTab(undefined, t("terminal"))}
              className="flex flex-col items-center gap-2 h-auto text-[11px] text-[#3f3f46] hover:text-[#14b8a6]"
            >
              <TerminalSquare className="size-4" />
              <span>{t("open")}</span>
            </Button>
          </div>
        )}

      </div>

      {/* Terminal area — right */}
      <div className="flex-1 relative overflow-hidden">
        {tabs.map((tab) => (
          <XtermPanel key={tab.id} termId={tab.id} isActive={activeTab === tab.id} />
        ))}
        {tabs.length === 0 && (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center flex flex-col items-center gap-3">
              <TerminalSquare className="size-5 text-[#3f3f46]" />
              <p className="text-[11px] text-[#3f3f46]">{t("noOpenTerminals")}</p>
              <Button
                variant="link"
                onClick={() => onSpawnTab(undefined, t("terminal"))}
                className="text-[11px] text-[#14b8a6] hover:text-[#2dd4bf] h-auto p-0"
              >
                {t("openTerminal")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
