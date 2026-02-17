// ── Git File List ────────────────────────────────────────────────────────────
// Reusable component for staged/unstaged file sections in GitPanel.

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Pencil,
  FileQuestion,
  FilePlus,
  FileMinus,
  CircleDot,
} from "lucide-react";
import type { StagedFile } from "@shared/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const KIND_ICON: Record<string, { icon: typeof Pencil; color: string }> = {
  modified: { icon: Pencil, color: "#eab308" },
  added: { icon: FilePlus, color: "#22c55e" },
  deleted: { icon: FileMinus, color: "#ef4444" },
  untracked: { icon: FileQuestion, color: "#a1a1aa" },
  renamed: { icon: CircleDot, color: "#06b6d4" },
  copied: { icon: CircleDot, color: "#06b6d4" },
  other: { icon: CircleDot, color: "#52525b" },
};

interface FileListProps {
  title: string;
  files: StagedFile[];
  /** "stage" shows + button, "unstage" shows − button */
  action: "stage" | "unstage";
  allActionLabel: string;
  onFileAction: (file: string) => void;
  onAllAction: () => void;
  onFileClick?: (file: string) => void;
}

export function FileList({
  title,
  files,
  action,
  allActionLabel,
  onFileAction,
  onAllAction,
  onFileClick,
}: FileListProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (files.length === 0) return null;

  const ActionIcon = action === "stage" ? Plus : Minus;

  return (
    <div className="flex flex-col">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-6 items-center gap-1 px-2 text-[11px] font-medium text-[#a1a1aa] hover:text-[#f4f4f5]"
      >
        {collapsed ? (
          <ChevronRight className="size-3 shrink-0" />
        ) : (
          <ChevronDown className="size-3 shrink-0" />
        )}
        <span className="flex-1 truncate text-left">
          {title} ({files.length})
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onAllAction();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onAllAction();
                }
              }}
              className="rounded p-0.5 hover:bg-white/[0.06]"
            >
              <ActionIcon className="size-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">{allActionLabel}</TooltipContent>
        </Tooltip>
      </button>

      {/* File list */}
      {!collapsed && (
        <div className="flex flex-col">
          {files.map((f) => {
            const cfg = KIND_ICON[f.kind] ?? { icon: CircleDot, color: "#52525b" };
            const Icon = cfg.icon;
            const fileName = f.file.split("/").pop() ?? f.file;
            const dir = f.file.includes("/") ? f.file.slice(0, f.file.lastIndexOf("/")) : "";

            return (
              <div
                key={f.file}
                className={cn(
                  "group flex h-[22px] items-center gap-1 px-2 pl-5",
                  onFileClick && "cursor-pointer hover:bg-white/[0.03]",
                )}
                onClick={() => onFileClick?.(f.file)}
              >
                <Icon className="size-2.5 shrink-0" style={{ color: cfg.color }} />
                <span className="truncate font-mono text-[10px] text-[#f4f4f5]">{fileName}</span>
                {dir && (
                  <span className="flex-1 truncate font-mono text-[10px] text-[#3f3f46]">
                    {dir}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-4 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileAction(f.file);
                  }}
                >
                  <ActionIcon className="size-2.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
