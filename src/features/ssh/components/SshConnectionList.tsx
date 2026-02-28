import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Wifi, WifiOff } from "lucide-react";
import { SshConnectionDialog } from "./SshConnectionDialog";
import { SshPortForwardPanel } from "./SshPortForwardPanel";
import type { SshConnectionConfig, SavedSshConnection } from "@shared/lib/types";

/** List of saved SSH connections with connect/disconnect actions. */
export function SshConnectionList() {
  const saved = useAppStore((s) => s.savedConnections);
  const activeConns = useAppStore((s) => s.activeConnections);
  const activeId = useAppStore((s) => s.activeConnectionId);
  const loadSaved = useAppStore((s) => s.sshLoadSaved);
  const sshConnect = useAppStore((s) => s.sshConnect);
  const sshDisconnect = useAppStore((s) => s.sshDisconnect);
  const sshSetActive = useAppStore((s) => s.sshSetActive);
  const sshPromptPassword = useAppStore((s) => s.sshPromptPassword);
  const deleteSaved = useAppStore((s) => s.sshDeleteSaved);

  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const isActive = (id: string) => activeConns.some((c) => c.id === id && c.status === "connected");

  const handleConnect = async (conn: SavedSshConnection) => {
    const config: SshConnectionConfig = {
      id: conn.id,
      name: conn.name,
      host: conn.host,
      port: conn.port,
      username: conn.username,
      authMethod: conn.authMethod as SshConnectionConfig["authMethod"],
      privateKeyPath: conn.privateKeyPath,
    };

    try {
      // For password auth, prompt user for password before connecting
      let password: string | null | undefined;
      if (config.authMethod === "password") {
        password = await sshPromptPassword(config);
        if (password === null) return; // User cancelled
      }
      await sshConnect(config, password);
      sshSetActive(conn.id);
      toast.success(t("sshConnected"));
    } catch (e) {
      toast.error(t("failedToConnect"), { description: String(e) });
    }
  };

  const handleDisconnect = async (id: string) => {
    await sshDisconnect(id);
    toast.success(t("sshDisconnected"));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <span className="text-k-text-secondary text-xs font-semibold tracking-wider uppercase">
          {t("sshRemote")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {saved.length === 0 ? (
          <p className="text-k-text-tertiary px-2 py-8 text-center text-xs">
            {t("sshNoConnections")}
          </p>
        ) : (
          <div className="space-y-1">
            {saved.map((conn) => {
              const connected = isActive(conn.id);
              const isCurrent = activeId === conn.id;

              return (
                <div
                  key={conn.id}
                  className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    isCurrent ? "bg-k-accent/10" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-k-text-primary truncate font-medium">{conn.name}</div>
                    <div className="text-k-text-tertiary truncate font-mono text-[10px]">
                      {conn.username}@{conn.host}:{conn.port}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {connected ? (
                      <button
                        type="button"
                        onClick={() => handleDisconnect(conn.id)}
                        className="p-1 text-emerald-400 transition-colors hover:text-red-400"
                        title={t("sshDisconnect")}
                      >
                        <Wifi className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConnect(conn)}
                        className="text-k-text-tertiary hover:text-k-accent p-1 transition-colors"
                        title={t("sshConnect")}
                      >
                        <WifiOff className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteSaved(conn.id)}
                      className="text-k-text-tertiary p-1 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
                      title={t("sshDelete")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeId && <SshPortForwardPanel />}

      <SshConnectionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
