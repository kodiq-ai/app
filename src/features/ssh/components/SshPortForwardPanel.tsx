import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

/** Panel for managing SSH port forwards. */
export function SshPortForwardPanel() {
  const activeId = useAppStore((s) => s.activeConnectionId);
  const forwards = useAppStore((s) => s.activeForwards);
  const startForward = useAppStore((s) => s.sshStartForward);
  const stopForward = useAppStore((s) => s.sshStopForward);
  const refreshForwards = useAppStore((s) => s.sshRefreshForwards);

  const [localPort, setLocalPort] = useState(3000);
  const [remotePort, setRemotePort] = useState(3000);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    refreshForwards();
  }, [refreshForwards]);

  if (!activeId) return null;

  const handleAdd = async () => {
    try {
      await startForward(activeId, localPort, remotePort);
      toast.success(`Port ${localPort} → ${remotePort}`);
      setAdding(false);
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <div className="border-t border-white/[0.06] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-k-text-secondary text-xs font-semibold uppercase tracking-wider">
          {t("sshPortForward")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={() => setAdding(!adding)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {adding && (
        <div className="mb-2 flex items-center gap-1.5">
          <Input
            type="number"
            value={localPort}
            onChange={(e) => setLocalPort(Number(e.target.value))}
            className="w-16 text-xs h-7"
            placeholder={t("sshLocalPort")}
          />
          <span className="text-k-text-tertiary text-xs">→</span>
          <Input
            type="number"
            value={remotePort}
            onChange={(e) => setRemotePort(Number(e.target.value))}
            className="w-16 text-xs h-7"
            placeholder={t("sshRemotePort")}
          />
          <Button size="sm" className="h-7 px-2 text-xs" onClick={handleAdd}>
            {t("sshStartForward")}
          </Button>
        </div>
      )}

      {forwards.length === 0 ? (
        <p className="text-k-text-tertiary text-[10px]">{t("sshNoForwards")}</p>
      ) : (
        <div className="space-y-1">
          {forwards.map((fwd) => (
            <div
              key={fwd.id}
              className="flex items-center justify-between rounded px-2 py-1 text-xs bg-white/[0.02]"
            >
              <span className="text-k-text-secondary font-mono">
                :{fwd.localPort} → {fwd.remoteHost}:{fwd.remotePort}
              </span>
              <button
                type="button"
                onClick={() => stopForward(fwd.id)}
                className="text-k-text-tertiary hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
