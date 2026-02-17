import { useState, useRef, useCallback, useMemo } from "react";
import { Plus, X, TerminalSquare, Search } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  onReopenTab: () => void;
}

export function TabBar({ onSpawnTab, onCloseTab, onReopenTab }: TabBarProps) {
  const tabs = useAppStore((s) => s.tabs);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const exitedTabs = useAppStore((s) => s.exitedTabs);
  const notifiedTabs = useAppStore((s) => s.notifiedTabs);
  const renameTab = useAppStore((s) => s.renameTab);
  const reorderTabs = useAppStore((s) => s.reorderTabs);
  const closedTabs = useAppStore((s) => s.closedTabs);
  const cliTools = useAppStore((s) => s.cliTools);
  const installedCli = useMemo(() => cliTools.filter((t) => t.installed), [cliTools]);

  // ── Tab close animation ────────────────────────────────────────────
  const [closingTabs, setClosingTabs] = useState<Set<string>>(new Set());

  const handleAnimatedClose = useCallback(
    (id: string) => {
      setClosingTabs((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setClosingTabs((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        onCloseTab(id);
      }, 150);
    },
    [onCloseTab],
  );

  // ── New terminal popover ──────────────────────────────────────────
  const [newTermOpen, setNewTermOpen] = useState(false);

  // ── Search filter ───────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const filteredTabs = useMemo(
    () =>
      search ? tabs.filter((tb) => tb.label.toLowerCase().includes(search.toLowerCase())) : tabs,
    [tabs, search],
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

  const handleDrop = useCallback(
    (e: React.DragEvent, toIdx: number) => {
      e.preventDefault();
      const fromIdx = dragIndexRef.current;
      if (fromIdx !== null && fromIdx !== toIdx) {
        reorderTabs(fromIdx, toIdx);
      }
      dragIndexRef.current = null;
      setDragOverIndex(null);
    },
    [reorderTabs],
  );

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
    <div className="relative flex flex-1 overflow-hidden" style={{ background: "#0a0a0c" }}>
      {/* Vertical tab sidebar — left */}
      <div className="flex w-44 shrink-0 flex-col overflow-hidden border-r border-white/[0.06]">
        {/* New terminal button with tool picker */}
        <div className="shrink-0 px-2 pt-2 pb-1">
          <Popover open={newTermOpen} onOpenChange={setNewTermOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-full justify-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.01] px-2.5 text-[11px] text-[#71717a] transition-all hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-[#a1a1aa]"
              >
                <Plus className="size-3" />
                <span>{t("newTerminal")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[200px] border-white/[0.06] bg-[#141517] p-1 shadow-xl"
              side="right"
              sideOffset={8}
              align="start"
            >
              {/* Shell */}
              <button
                onClick={() => {
                  onSpawnTab(undefined, t("terminal"));
                  setNewTermOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
              >
                <TabIconSvg icon="shell" size={14} />
                <span className="text-[12px] text-[#a1a1aa]">{t("terminal")}</span>
              </button>

              {/* AI tools */}
              {installedCli.length > 0 && (
                <>
                  <div className="mx-1 my-1 h-px bg-white/[0.06]" />
                  {installedCli.map((tool) => (
                    <button
                      key={tool.bin}
                      onClick={() => {
                        onSpawnTab(tool.bin, tool.name);
                        setNewTermOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
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
          <div className="shrink-0 px-2 pb-1">
            <div className="flex h-7 items-center gap-1.5 rounded-md border border-white/[0.04] bg-white/[0.02] px-2">
              <Search className="size-3 shrink-0 text-[#3f3f46]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchTerminals")}
                className="h-full min-w-0 flex-1 bg-transparent text-[11px] text-[#a1a1aa] outline-none placeholder:text-[#3f3f46]"
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
                  draggable={!closingTabs.has(tab.id)}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "relative",
                    dragOverIndex === idx &&
                      "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[#06b6d4]",
                    closingTabs.has(tab.id) &&
                      "motion-safe:animate-out motion-safe:fade-out-0 motion-safe:zoom-out-95 overflow-hidden motion-safe:duration-150",
                  )}
                >
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab(tab.id)}
                    onDoubleClick={() => startRename(tab.id, tab.label)}
                    className={cn(
                      "group h-8 w-full justify-start gap-1.5 rounded-none px-2.5 text-[11px]",
                      activeTab === tab.id
                        ? "bg-white/[0.04] text-[#e4e4e7]"
                        : "text-[#52525c] hover:bg-white/[0.02] hover:text-[#a1a1aa]",
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
                        className="h-auto min-w-0 flex-1 border-b border-[#06b6d4]/40 bg-transparent px-0 py-0 text-[11px] text-[#e4e4e7] outline-none"
                        autoFocus
                      />
                    ) : (
                      <span
                        className={cn(
                          "flex-1 truncate text-left",
                          exitedTabs.has(tab.id) && "opacity-50",
                        )}
                      >
                        {tab.label}
                      </span>
                    )}
                    {notifiedTabs.has(tab.id) && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#06b6d4]"
                        title={t("processFinished")}
                      />
                    )}
                    {!notifiedTabs.has(tab.id) && exitedTabs.has(tab.id) && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3f3f46]"
                        title={t("processExited")}
                      />
                    )}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnimatedClose(tab.id);
                      }}
                      className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded text-[#52525c] opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.08] hover:text-[#a1a1aa]"
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
                <ContextMenuItem onClick={() => handleAnimatedClose(tab.id)}>
                  {t("close")}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => closeOtherTabs(tab.id)} disabled={tabs.length <= 1}>
                  {t("closeOthers")}
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => closeTabsToRight(tab.id)}
                  disabled={tabs.indexOf(tab) === tabs.length - 1}
                >
                  {t("closeToRight")}
                </ContextMenuItem>
                <ContextMenuItem onClick={onReopenTab} disabled={closedTabs.length === 0}>
                  {t("reopenClosedTab")}
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
          <div className="flex flex-1 items-center justify-center">
            <Button
              variant="ghost"
              onClick={() => onSpawnTab(undefined, t("terminal"))}
              className="flex h-auto flex-col items-center gap-2 text-[11px] text-[#3f3f46] hover:text-[#06b6d4]"
            >
              <TerminalSquare className="size-4" />
              <span>{t("open")}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Terminal area — right */}
      <div className="relative flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <XtermPanel key={tab.id} termId={tab.id} isActive={activeTab === tab.id} />
        ))}
        {tabs.length === 0 && (
          <div className="flex h-full flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <TerminalSquare className="size-5 text-[#3f3f46]" />
              <p className="text-[11px] text-[#3f3f46]">{t("noOpenTerminals")}</p>
              <Button
                variant="link"
                onClick={() => onSpawnTab(undefined, t("terminal"))}
                className="h-auto p-0 text-[11px] text-[#06b6d4] hover:text-[#22d3ee]"
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
