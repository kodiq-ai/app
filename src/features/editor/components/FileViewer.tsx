import { useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Copy, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
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
    [openFileContent],
  );

  const fileName = openFilePath?.split("/").pop() || "file";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  // Syntax highlighting via shiki (must be called before conditional returns)
  const highlight = useHighlighter(openFileContent || "", ext);

  // Build breadcrumb segments relative to project (before conditional return for hooks rules)
  const breadcrumbs = useMemo(() => {
    if (!openFilePath) return [];
    if (!projectPath) return [{ name: fileName, path: openFilePath, isLast: true }];
    const relative = openFilePath.startsWith(projectPath)
      ? openFilePath.slice(projectPath.length + 1)
      : openFilePath;
    const parts = relative.split("/");
    let accumulated = projectPath;
    return parts.map((part, i) => {
      accumulated += `/${part}`;
      return { name: part, path: accumulated, isLast: i === parts.length - 1 };
    });
  }, [openFilePath, projectPath, fileName]);

  if (!openFilePath || openFileContent === null) return null;

  const lineCount = lines.length;
  const gutterWidth = String(lineCount).length;

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
      () => toast.error(t("failedToCopy")),
    );
  };

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 absolute inset-0 z-20 flex flex-col bg-[var(--bg-base)] motion-safe:duration-200">
      {/* Breadcrumb Header */}
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-white/[0.06] px-3">
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
          {breadcrumbs.map((crumb, i) => (
            <div
              key={crumb.path}
              className="flex min-w-0 shrink-0 items-center gap-0.5 last:shrink"
            >
              {i > 0 && <ChevronRight className="size-2.5 shrink-0 text-[#27272a]" />}
              {crumb.isLast ? (
                <span className="flex items-center gap-1.5 truncate text-[11px] font-medium text-[#e4e4e7]">
                  <FileIcon name={crumb.name} isDir={false} />
                  {crumb.name}
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => navigateToDir(crumb.path)}
                  className="h-5 px-1 text-[11px] font-normal text-[#52525c] hover:text-[#a1a1aa]"
                >
                  {crumb.name}
                </Button>
              )}
            </div>
          ))}
        </div>
        <span className="shrink-0 font-mono text-[10px] text-[#3f3f46]">{ext}</span>
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
        <div className="flex overflow-x-auto font-mono text-[12px] leading-[1.6]">
          {/* Line numbers gutter */}
          <div
            className="sticky left-0 shrink-0 border-r border-white/[0.03] bg-[var(--bg-base)] py-4 pr-3 pl-3 text-right text-[#27272a] select-none"
            style={{ minWidth: `${gutterWidth + 3}ch` }}
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          {/* Code */}
          <pre className="flex-1 py-4 pr-4 pl-4 whitespace-pre text-[#c8c8d0]">
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
      <div className="flex h-6 shrink-0 items-center gap-3 border-t border-white/[0.06] px-3">
        <span className="truncate font-mono text-[10px] text-[#3f3f46]">{openFilePath}</span>
        <span className="ml-auto shrink-0 font-mono text-[10px] text-[#3f3f46]">
          {lineCount} {t("lines")}
        </span>
      </div>
    </div>
  );
}
