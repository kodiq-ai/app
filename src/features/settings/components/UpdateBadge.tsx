// ── Update Badge ─────────────────────────────────────────────────────────────
import { useAppStore } from "@/store";

interface UpdateBadgeProps {
  onClick?: () => void;
}

export function UpdateBadge({ onClick }: UpdateBadgeProps) {
  const updateAvailable = useAppStore((s) => s.updateAvailable);

  if (!updateAvailable) return null;

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
