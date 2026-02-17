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
      className="flex items-center gap-1.5 rounded-md bg-[#06b6d4]/10 px-2 py-1 text-[10px] font-medium text-[#06b6d4] transition-colors hover:bg-[#06b6d4]/20"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#06b6d4] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#06b6d4]" />
      </span>
      v{updateAvailable.version}
    </button>
  );
}
