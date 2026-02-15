import { useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Copy, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileIcon } from "@/components/icons";
import { t } from "@/lib/i18n";
import { useHighlighter } from "@/hooks/useHighlighter";

export function FileViewer() {
  const openFilePath = useAppStore((s) => s.openFilePath);
  const openFileContent = useAppStore((s) => s.openFileContent);
  const setOpenFile = useAppStore((s) => s.setOpenFile);

  // Close on Escape
  useEffect(() => {
    if (!openFilePath) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpenFile(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [openFilePath, setOpenFile]);

  const projectPath = useAppStore((s) => s.projectPath);

  const lines = useMemo(
    () => (openFileContent ? openFileContent.split("\n") : []),
    [openFileContent]
  );

  const fileName = openFilePath?.split("/").pop() || "file";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  // Syntax highlighting via shiki (must be called before conditional returns)
  const highlight = useHighlighter(openFileContent || "", ext);

  if (!openFilePath || openFileContent === null) return null;

  const lineCount = lines.length;
  const gutterWidth = String(lineCount).length;

  // Build breadcrumb segments relative to project
  const breadcrumbs = useMemo(() => {
    if (!projectPath) return [{ name: fileName, path: openFilePath, isLast: true }];
    const relative = openFilePath.startsWith(projectPath)
      ? openFilePath.slice(projectPath.length + 1)
      : openFilePath;
    const parts = relative.split("/");
    let accumulated = projectPath;
    return parts.map((part, i) => {
      accumulated += "/" + part;
      return { name: part, path: accumulated, isLast: i === parts.length - 1 };
    });
  }, [openFilePath, projectPath]);

  const navigateToDir = async (dirPath: string) => {
    // Open file from breadcrumb directory click — for now just copy path
    try {
      const content = await invoke<string>("read_file", { path: dirPath });
      setOpenFile(dirPath, content);
    } catch {
      // It's a directory, not a file — that's expected
    }
  };

  const copyContent = () => {
    navigator.clipboard.writeText(openFileContent).then(
      () => toast.success(t("contentCopied")),
      () => toast.error(t("failedToCopy"))
    );
  };

  return (
    <div className="absolute inset-0 z-20 bg-[var(--bg-base)] flex flex-col">
      {/* Breadcrumb Header */}
      <div className="flex items-center h-9 px-3 border-b border-white/[0.06] shrink-0 gap-1">
        <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-hidden">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.path} className="flex items-center gap-0.5 shrink-0 last:shrink min-w-0">
              {i > 0 && <ChevronRight className="size-2.5 text-[#27272a] shrink-0" />}
              {crumb.isLast ? (
                <span className="flex items-center gap-1.5 text-[11px] text-[#e4e4e7] font-medium truncate">
                  <FileIcon name={crumb.name} isDir={false} />
                  {crumb.name}
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => navigateToDir(crumb.path)}
                  className="h-5 px-1 text-[11px] text-[#52525c] hover:text-[#a1a1aa] font-normal"
                >
                  {crumb.name}
                </Button>
              )}
            </div>
          ))}
        </div>
        <span className="text-[10px] text-[#3f3f46] font-mono shrink-0">{ext}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={copyContent}
              className="text-[#52525c] hover:text-[#a1a1aa]"
            >
              <Copy className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("copy")}</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setOpenFile(null)}
          className="text-[#52525c] hover:text-[#a1a1aa]"
        >
          <X className="size-3" />
        </Button>
      </div>

      {/* Content with line numbers */}
      <ScrollArea className="flex-1">
        <div className="flex text-[12px] leading-[1.6] font-mono overflow-x-auto">
          {/* Line numbers gutter */}
          <div className="sticky left-0 shrink-0 select-none text-right pr-3 pl-3 py-4 text-[#27272a] bg-[var(--bg-base)] border-r border-white/[0.03]"
            style={{ minWidth: `${gutterWidth + 3}ch` }}
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          {/* Code */}
          <pre className="flex-1 py-4 pl-4 pr-4 text-[#c8c8d0] whitespace-pre">
            {highlight.ready ? (
              <code>
                {highlight.lines.map((html, i) => (
                  <span
                    key={i}
                    className="shiki-line"
                    dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
                  />
                ))}
              </code>
            ) : (
              <code>{openFileContent}</code>
            )}
          </pre>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center h-6 px-3 border-t border-white/[0.06] shrink-0 gap-3">
        <span className="text-[10px] text-[#3f3f46] font-mono truncate">{openFilePath}</span>
        <span className="text-[10px] text-[#3f3f46] font-mono ml-auto shrink-0">
          {lineCount} {t("lines")}
        </span>
      </div>
    </div>
  );
}
