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
      className="flex items-center gap-1.5 rounded-md bg-[#4DA3C7]/10 px-2 py-1 text-[10px] font-medium text-[#4DA3C7] transition-colors hover:bg-[#4DA3C7]/20"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4DA3C7] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4DA3C7]" />
      </span>
      v{updateAvailable.version}
    </button>
  );
}
