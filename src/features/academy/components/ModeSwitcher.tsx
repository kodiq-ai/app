// ── Mode Switcher ────────────────────────────────────────────────────────────
// Segmented control in the title bar for switching between app sections.
// Mirrors mobile bottom navigation: Workspace, Home, Progress, Feed, Leaderboard.

import { BarChart3, Code2, Home, Trophy, Users, type LucideIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { AppMode } from "@shared/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ── Mode Button ──────────────────────────────────────────

function ModeButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150",
        active
          ? "bg-white/[0.10] text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
          : "text-white/40 hover:bg-white/[0.04] hover:text-white/60",
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.5 : 2} />
      {label}
    </button>
  );
}

// ── Mode Switcher ────────────────────────────────────────

const modes: { mode: AppMode; icon: LucideIcon; labelKey: string }[] = [
  { mode: "developer", icon: Code2, labelKey: "workspace" },
  { mode: "home", icon: Home, labelKey: "home" },
  { mode: "progress", icon: BarChart3, labelKey: "progress" },
  { mode: "feed", icon: Users, labelKey: "feed" },
  { mode: "leaderboard", icon: Trophy, labelKey: "leaderboard" },
];

export function ModeSwitcher() {
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
      {modes.map(({ mode, icon, labelKey }) => (
        <ModeButton
          key={mode}
          icon={icon}
          label={t(labelKey)}
          active={appMode === mode}
          onClick={() => setAppMode(mode)}
        />
      ))}
    </div>
  );
}
