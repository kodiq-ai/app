import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { fs } from "@shared/lib/tauri";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useAppStore, type FileEntry } from "@/lib/store";
import { FileIcon } from "@/components/icons";
import { t } from "@/lib/i18n";

/** Recursively flatten file tree into list of file paths */
function flattenTree(entries: FileEntry[], acc: FileEntry[] = []): FileEntry[] {
  for (const e of entries) {
    acc.push(e);
    if (e.children) flattenTree(e.children, acc);
  }
  return acc;
}

export function FileSearch() {
  const open = useAppStore((s) => s.fileSearchOpen);
  const setOpen = useAppStore((s) => s.setFileSearchOpen);
  const fileTree = useAppStore((s) => s.fileTree);
  const setOpenFile = useAppStore((s) => s.setOpenFile);
  const projectPath = useAppStore((s) => s.projectPath);

  const [query, setQuery] = useState("");

  const allFiles = useMemo(() => flattenTree(fileTree).filter((e) => !e.isDir), [fileTree]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allFiles.slice(0, 50);
    const q = query.toLowerCase();
    return allFiles
      .filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
      .slice(0, 50);
  }, [allFiles, query]);

  const openFile = useCallback(
    async (entry: FileEntry) => {
      try {
        const content = await fs.readFile(entry.path);
        setOpenFile(entry.path, content);
      } catch (e) {
        toast.error(t("failedToOpenFile"), { description: String(e) });
      }
      setOpen(false);
      setQuery("");
    },
    [setOpenFile, setOpen],
  );

  const getRelativePath = (fullPath: string) => {
    if (projectPath && fullPath.startsWith(projectPath)) {
      return fullPath.slice(projectPath.length + 1);
    }
    return fullPath;
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
      }}
      title={t("searchFiles")}
      description={t("findFile")}
      showCloseButton={false}
    >
      <CommandInput placeholder={t("fileName")} value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>{t("fileNotFound")}</CommandEmpty>
        <CommandGroup heading={query ? `${t("found")}: ${filtered.length}` : t("files")}>
          {filtered.map((f) => (
            <CommandItem key={f.path} value={f.path} onSelect={() => openFile(f)} className="gap-2">
              <FileIcon name={f.name} isDir={false} />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="max-w-[200px] truncate font-mono text-[10px] text-[#6E6E76]">
                {getRelativePath(f.path)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
