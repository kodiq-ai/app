// ── Editor Tab Bar ──────────────────────────────────────────────────────────
// Horizontal tab row — file name, dirty dot, close X, active highlight.
// Supports drag & drop reordering.

import { useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { FileIcon } from "@/components/icons";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { t } from "@/lib/i18n";
import type { EditorTab } from "../store/editorSlice";

interface Props {
  tabs: EditorTab[];
  activeTab: string | null;
  onClose: (path: string) => void;
}

export function EditorTabBar({ tabs, activeTab, onClose }: Props) {
  const setActiveEditorTab = useAppStore((s) => s.setActiveEditorTab);
  const reorderEditorTabs = useAppStore((s) => s.reorderEditorTabs);

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
        reorderEditorTabs(fromIdx, toIdx);
      }
      dragIndexRef.current = null;
      setDragOverIndex(null);
    },
    [reorderEditorTabs],
  );

  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  return (
    <div className="flex h-8 shrink-0 items-center gap-0 overflow-x-auto border-b border-white/[0.06] bg-[var(--bg-base)]">
      {tabs.map((tab, idx) => {
        const isActive = tab.path === activeTab;
        const isDirty = tab.content !== tab.savedContent;

        return (
          <div
            key={tab.path}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            className={`group relative flex h-full max-w-[180px] min-w-[100px] shrink-0 cursor-pointer items-center gap-1.5 border-r border-white/[0.04] px-3 transition-colors ${
              isActive
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            } ${dragOverIndex === idx ? "before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-[var(--kodiq-accent)]" : ""}`}
            onClick={() => setActiveEditorTab(tab.path)}
          >
            {/* File icon */}
            <FileIcon name={tab.name} isDir={false} />

            {/* File name */}
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{tab.name}</span>

            {/* Dirty indicator or close button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.path);
                  }}
                  aria-label={isDirty ? "unsaved changes" : "close tab"}
                  className={`flex size-4 shrink-0 items-center justify-center rounded-sm transition-colors ${
                    isDirty ? "text-[var(--kodiq-accent)]" : "opacity-0 group-hover:opacity-100"
                  } hover:bg-white/[0.06] hover:text-[var(--text-primary)]`}
                >
                  {isDirty ? (
                    <span className="block size-2 rounded-full bg-current" />
                  ) : (
                    <X className="size-3" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isDirty ? t("unsavedChanges") : t("closeTab")}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
}
