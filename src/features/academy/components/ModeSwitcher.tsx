// ── Mode Switcher ────────────────────────────────────────────────────────────
// Pill toggle in the title bar for switching between Developer, Academy, and Feed.

import { Code2, GraduationCap, Users, type LucideIcon } from "lucide-react";
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
        "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-white/[0.08] text-white"
          : "text-k-text-tertiary hover:text-k-text-secondary hover:bg-white/[0.04]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ── Mode Switcher ────────────────────────────────────────

const modes: { mode: AppMode; icon: LucideIcon; labelKey: string }[] = [
  { mode: "developer", icon: Code2, labelKey: "developer" },
  { mode: "academy", icon: GraduationCap, labelKey: "academy" },
  { mode: "feed", icon: Users, labelKey: "feed" },
];

export function ModeSwitcher() {
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-0.5">
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
