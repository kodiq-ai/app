import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff } from "lucide-react";

/** Small badge in the title bar showing active SSH connection status. */
export function SshStatusBadge() {
  const activeId = useAppStore((s) => s.activeConnectionId);
  const connections = useAppStore((s) => s.activeConnections);
  const active = connections.find((c) => c.id === activeId);

  if (!active) return null;

  const isConnected = active.status === "connected";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        isConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400",
      )}
      title={`${active.config.username}@${active.config.host}`}
    >
      {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      <span className="max-w-[120px] truncate">
        {active.config.name || `${active.config.host}`}
      </span>
    </div>
  );
}
