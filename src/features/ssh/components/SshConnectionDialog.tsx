import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { ssh } from "@shared/lib/tauri";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SshAuthMethod, SshConnectionConfig } from "@shared/lib/types";
import { SshKeyBrowser } from "./SshKeyBrowser";

interface Props {
  open: boolean;
  onClose: () => void;
  editConfig?: SshConnectionConfig | null;
}

/** Dialog for creating/editing SSH connections. */
export function SshConnectionDialog({ open, onClose: onCloseRaw, editConfig }: Props) {
  const sshConnect = useAppStore((s) => s.sshConnect);
  const sshSaveConnection = useAppStore((s) => s.sshSaveConnection);
  const connecting = useAppStore((s) => s.sshConnecting);

  const [name, setName] = useState(editConfig?.name ?? "");
  const [host, setHost] = useState(editConfig?.host ?? "");
  const [port, setPort] = useState(editConfig?.port ?? 22);
  const [username, setUsername] = useState(editConfig?.username ?? "root");
  const [authMethod, setAuthMethod] = useState<SshAuthMethod>(editConfig?.authMethod ?? "key");
  const [keyPath, setKeyPath] = useState(editConfig?.privateKeyPath ?? "~/.ssh/id_ed25519");
  const [password, setPassword] = useState("");
  const [testing, setTesting] = useState(false);

  // Reset form when editConfig changes
  useEffect(() => {
    setName(editConfig?.name ?? "");
    setHost(editConfig?.host ?? "");
    setPort(editConfig?.port ?? 22);
    setUsername(editConfig?.username ?? "root");
    setAuthMethod(editConfig?.authMethod ?? "key");
    setKeyPath(editConfig?.privateKeyPath ?? "~/.ssh/id_ed25519");
    setPassword("");
  }, [editConfig]);

  // Wrap onClose to always clear password
  const onClose = () => {
    setPassword("");
    onCloseRaw();
  };

  if (!open) return null;

  const buildConfig = (): SshConnectionConfig => ({
    id: editConfig?.id ?? crypto.randomUUID(),
    name: name || `${username}@${host}`,
    host,
    port,
    username,
    authMethod,
    privateKeyPath: authMethod === "key" ? keyPath : undefined,
  });

  const handleConnect = async () => {
    try {
      const config = buildConfig();
      // Connect first — only save on success
      await sshConnect(config, authMethod === "password" ? password : undefined);
      await sshSaveConnection(config);
      toast.success(t("sshConnected"));
      setPassword(""); // clear password from component state
      onClose();
    } catch (e) {
      toast.error(t("failedToConnect"), { description: String(e) });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const config = buildConfig();
      const ok = await ssh.testConnection(config, authMethod === "password" ? password : undefined);
      if (ok) {
        toast.success(t("sshTestSuccess"));
      } else {
        toast.error(t("sshTestFailed"));
      }
    } catch (e) {
      toast.error(t("sshTestFailed"), { description: String(e) });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      await sshSaveConnection(buildConfig());
      toast.success(t("sshSave"));
      onClose();
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-k-bg-elevated border-k-border w-[420px] rounded-lg border p-5 shadow-xl">
        <h3 className="text-k-text-primary mb-4 text-sm font-semibold">
          {editConfig ? t("sshEditConnection") : t("sshNewConnection")}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-k-text-secondary mb-1 block text-xs">
              {t("sshConnectionName")}
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-server" />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-k-text-secondary mb-1 block text-xs">{t("sshHost")}</label>
              <Input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.100"
              />
            </div>
            <div className="w-20">
              <label className="text-k-text-secondary mb-1 block text-xs">{t("sshPort")}</label>
              <Input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="text-k-text-secondary mb-1 block text-xs">{t("sshUsername")}</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>

          <div>
            <label className="text-k-text-secondary mb-1 block text-xs">{t("sshAuthMethod")}</label>
            <div className="flex gap-1">
              {(["key", "password", "agent"] as SshAuthMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAuthMethod(m)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    authMethod === m
                      ? "bg-k-accent/20 text-k-accent"
                      : "text-k-text-tertiary hover:text-k-text-secondary bg-white/5"
                  }`}
                >
                  {
                    { key: t("sshAuthKey"), password: t("sshAuthPassword"), agent: t("sshAuthAgent") }[
                      m
                    ]
                  }
                </button>
              ))}
            </div>
          </div>

          {authMethod === "key" && (
            <div>
              <label className="text-k-text-secondary mb-1 block text-xs">
                {t("sshPrivateKeyPath")}
              </label>
              <Input
                value={keyPath}
                onChange={(e) => setKeyPath(e.target.value)}
                placeholder="~/.ssh/id_ed25519"
                className="font-mono text-xs"
              />
              <SshKeyBrowser onSelect={setKeyPath} />
            </div>
          )}

          {authMethod === "password" && (
            <div>
              <label className="text-k-text-secondary mb-1 block text-xs">{t("sshPassword")}</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-between">
          <Button variant="outline" size="sm" onClick={handleTest} disabled={!host || testing}>
            {testing ? "..." : t("sshTestConnection")}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t("sshCancel")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={!host}>
              {t("sshSave")}
            </Button>
            <Button size="sm" onClick={handleConnect} disabled={!host || connecting}>
              {connecting ? t("sshConnecting") : t("sshConnect")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
