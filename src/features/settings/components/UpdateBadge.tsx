// ── Update Badge ─────────────────────────────────────────────────────────────
import { useUpdateChecker } from "../hooks/useUpdateChecker";

interface UpdateBadgeProps {
  onClick?: () => void;
}

export function UpdateBadge({ onClick }: UpdateBadgeProps) {
  const { updateAvailable } = useUpdateChecker();

  if (!updateAvailable) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#14b8a6]/10 text-[#14b8a6] text-[10px] font-medium hover:bg-[#14b8a6]/20 transition-colors"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14b8a6] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#14b8a6]" />
      </span>
      v{updateAvailable.version}
    </button>
  );
}
