// ── Update Badge ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useAppStore } from "@/store";
import { t } from "@shared/i18n";
import { isTauri } from "@shared/lib/tauri";

interface UpdateBadgeProps {
  onClick?: () => void;
}

export function UpdateBadge({ onClick }: UpdateBadgeProps) {
  const updateAvailable = useAppStore((s) => s.updateAvailable);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri) return;
    import("@tauri-apps/api/app")
      .then((mod) => mod.getVersion())
      .then(setCurrentVersion)
      .catch(() => {});
  }, []);

  // Update available — show pulsing badge with new version
  if (updateAvailable) {
    return (
      <button
        onClick={onClick}
        className="bg-k-accent/10 text-k-accent hover:bg-k-accent/20 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
      >
        <span className="relative flex h-2 w-2">
          <span className="bg-k-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
          <span className="bg-k-accent relative inline-flex h-2 w-2 rounded-full" />
        </span>
        v{updateAvailable.version}
      </button>
    );
  }

  // No update — show current version label
  if (!currentVersion) return null;

  return (
    <span className="text-k-text-tertiary px-1.5 text-[10px] font-medium tracking-wide">
      {t("appLabel")} v{currentVersion}
    </span>
  );
}
