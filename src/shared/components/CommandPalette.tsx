import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import { useAppStore } from "@/lib/store";
import {
  TerminalSquare,
  FolderOpen,
  PanelLeft,
  PanelLeftClose,
  X,
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  Settings,
} from "lucide-react";
import { t } from "@/lib/i18n";

interface CommandPaletteProps {
  onSpawnTab: (command?: string, label?: string) => Promise<string | null>;
  onOpenFolder: () => void;
  onCloseProject: () => void;
}

export function CommandPalette({ onSpawnTab, onOpenFolder, onCloseProject }: CommandPaletteProps) {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setViewport = useAppStore((s) => s.setViewport);
  const previewUrl = useAppStore((s) => s.previewUrl);
  const setPreviewUrl = useAppStore((s) => s.setPreviewUrl);
  const cliTools = useAppStore((s) => s.cliTools);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  const runAndClose = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  const installedCli = cliTools.filter((tool) => tool.installed);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("commandPalette")}
      description={t("searchCommandsDesc")}
      showCloseButton={false}
    >
      <CommandInput placeholder={t("searchCommands")} />
      <CommandList>
        <CommandEmpty>{t("nothingFound")}</CommandEmpty>

        {/* Terminal */}
        <CommandGroup heading={t("terminal")}>
          <CommandItem onSelect={() => runAndClose(() => onSpawnTab(undefined, t("terminal")))}>
            <TerminalSquare className="size-4" />
            <span>{t("newTerminal")}</span>
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
          {installedCli.map((tool) => (
            <CommandItem key={tool.bin} onSelect={() => runAndClose(() => onSpawnTab(tool.bin, tool.name))}>
              <TerminalSquare className="size-4" />
              <span>{t("run")} {tool.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* View */}
        <CommandGroup heading={t("view")}>
          <CommandItem onSelect={() => runAndClose(toggleSidebar)}>
            {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
            <span>{sidebarOpen ? t("hideSidebar") : t("showSidebar")}</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(() => setViewport("desktop"))}>
            <Monitor className="size-4" />
            <span>{t("desktop")}</span>
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(() => setViewport("tablet"))}>
            <Tablet className="size-4" />
            <span>{t("tablet")}</span>
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(() => setViewport("mobile"))}>
            <Smartphone className="size-4" />
            <span>{t("mobile")}</span>
          </CommandItem>
          {previewUrl && (
            <CommandItem onSelect={() => runAndClose(() => setPreviewUrl(previewUrl.split("?")[0] + "?_r=" + Date.now()))}>
              <RotateCcw className="size-4" />
              <span>{t("refreshPreview")}</span>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        {/* Project */}
        <CommandGroup heading={t("project")}>
          <CommandItem onSelect={() => runAndClose(onOpenFolder)}>
            <FolderOpen className="size-4" />
            <span>{t("openProject")}…</span>
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(onCloseProject)}>
            <X className="size-4" />
            <span>{t("closeProject")}</span>
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(() => setSettingsOpen(true))}>
            <Settings className="size-4" />
            <span>{t("settings")}</span>
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
