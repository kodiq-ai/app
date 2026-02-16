import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { ChevronRight, Copy, FolderOpen, TerminalSquare } from "lucide-react";
import { Loader } from "@/components/Loader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FileIcon } from "@/components/icons";
import { useAppStore, type FileEntry } from "@/lib/store";
import { t } from "@/lib/i18n";

interface TreeItemProps {
  entry: FileEntry;
  depth: number;
  onExpand: (path: string) => Promise<FileEntry[]>;
}

export function TreeItem({ entry, depth, onExpand }: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileEntry[]>(entry.children || []);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const setOpenFile = useAppStore((s) => s.setOpenFile);
  const openFilePath = useAppStore((s) => s.openFilePath);
  const pl = 12 + depth * 14;

  const handleClick = async () => {
    if (entry.isDir) {
      if (!loaded) {
        setLoading(true);
        try {
          const ch = await onExpand(entry.path);
          setChildren(ch);
          setLoaded(true);
        } catch (e) {
          toast.error(t("failedToOpenFolder"), { description: String(e) });
        } finally {
          setLoading(false);
        }
      }
      setIsOpen(!isOpen);
    } else {
      try {
        const content = await invoke<string>("read_file", { path: entry.path });
        setOpenFile(entry.path, content);
      } catch (e) {
        toast.error(t("failedToReadFile"), { description: String(e) });
      }
    }
  };

  const copyPath = () => {
    navigator.clipboard.writeText(entry.path).then(
      () => toast.success(t("pathCopied")),
      () => toast.error(t("failedToCopyPath"))
    );
  };

  const copyName = () => {
    navigator.clipboard.writeText(entry.name).then(
      () => toast.success(t("nameCopied")),
      () => toast.error(t("failedToCopyName"))
    );
  };

  const revealInSidebar = () => {
    if (entry.isDir) {
      handleClick();
    }
  };

  const isActive = !entry.isDir && openFilePath === entry.path;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Button
            variant="ghost"
            onClick={handleClick}
            className={cn(
              "w-full justify-start gap-1.5 h-[26px] text-[11px] rounded-none px-0",
              isActive ? "bg-white/[0.04] text-[#e4e4e7]" : "hover:bg-white/[0.025]"
            )}
            style={{ paddingLeft: pl }}
          >
            {entry.isDir ? (
              loading ? (
                <Loader size="sm" className="size-2.5 shrink-0" />
              ) : (
                <ChevronRight
                  className={cn(
                    "size-2.5 shrink-0 text-[#3f3f46] transition-transform duration-150",
                    isOpen && "rotate-90"
                  )}
                />
              )
            ) : (
              <span className="w-2.5 shrink-0" />
            )}
            <FileIcon name={entry.name} isDir={entry.isDir} />
            <span className={cn(
              "truncate text-left",
              isActive ? "text-[#e4e4e7]" : entry.isDir ? "text-[#a1a1aa]" : "text-[#71717a]"
            )}>
              {entry.name}
            </span>
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {entry.isDir && (
            <>
              <ContextMenuItem onClick={revealInSidebar}>
                <FolderOpen className="size-3.5 mr-2" />
                {t("openFolder")}
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={copyPath}>
            <Copy className="size-3.5 mr-2" />
            {t("copyPath")}
          </ContextMenuItem>
          <ContextMenuItem onClick={copyName}>
            <TerminalSquare className="size-3.5 mr-2" />
            {t("copyName")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {(isOpen || loaded) && (
        <div className={cn(
          "grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}>
          <div className="overflow-hidden">
            {children.map((c) => (
              <TreeItem key={c.path || c.name} entry={c} depth={depth + 1} onExpand={onExpand} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
