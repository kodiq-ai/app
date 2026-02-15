import { useAppStore } from "@/lib/store";
import { CLI_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { TabIconSvg } from "@/components/icons";

interface QuickLaunchProps {
  onSpawnTab: (command?: string, label?: string) => Promise<string | null>;
}

export function QuickLaunch({ onSpawnTab }: QuickLaunchProps) {
  const cliTools = useAppStore((s) => s.cliTools);
  const installedCli = cliTools.filter((t) => t.installed);

  if (installedCli.length === 0) return null;

  return (
    <div className="border-t border-white/[0.06] px-1 py-1.5 shrink-0">
      <span className="text-[10px] text-[#52525c] font-medium uppercase tracking-wider px-1.5 mb-1 block">AI</span>
      <div className="flex flex-col gap-0.5">
        {installedCli.map((tool) => (
          <Button
            key={tool.bin}
            variant="ghost"
            onClick={() => onSpawnTab(tool.bin, tool.name)}
            className="justify-start gap-1.5 h-7 px-2 text-[11px] text-[#52525c] hover:text-[#a1a1aa] hover:bg-white/[0.02]"
          >
            <TabIconSvg icon={tool.bin} size={12} />
            <span className="truncate">{tool.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
