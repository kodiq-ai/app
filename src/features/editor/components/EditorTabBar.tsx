// ── Editor Tab Bar ──────────────────────────────────────────────────────────
// Horizontal tab row — file name, dirty dot, close X, active highlight.

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

  return (
    <div className="flex h-8 shrink-0 items-center gap-0 overflow-x-auto border-b border-white/[0.06] bg-[var(--bg-base)]">
      {tabs.map((tab) => {
        const isActive = tab.path === activeTab;
        const isDirty = tab.content !== tab.savedContent;

        return (
          <div
            key={tab.path}
            className={`group flex h-full max-w-[180px] min-w-[100px] shrink-0 cursor-pointer items-center gap-1.5 border-r border-white/[0.04] px-3 transition-colors ${
              isActive
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
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
