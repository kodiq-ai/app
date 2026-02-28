import { useEffect, useState } from "react";
import { fs } from "@shared/lib/tauri";
import { t } from "@/lib/i18n";
import { Key } from "lucide-react";

interface SshKeyBrowserProps {
  onSelect: (path: string) => void;
}

/** Browse ~/.ssh/ directory for key files. */
export function SshKeyBrowser({ onSelect }: SshKeyBrowserProps) {
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const home = process.env.HOME || process.env.USERPROFILE || "~";
    const sshDir = `${home}/.ssh`;

    fs.readDir(sshDir)
      .then((entries) => {
        const keyFiles = entries
          .filter(
            (e) =>
              !e.isDir &&
              !e.name.endsWith(".pub") &&
              !e.name.endsWith(".known_hosts") &&
              !e.name.endsWith(".known_hosts.old") &&
              e.name !== "config" &&
              e.name !== "authorized_keys",
          )
          .map((e) => e.path);
        setKeys(keyFiles);
      })
      .catch(() => setKeys([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (keys.length === 0) return null;

  return (
    <div className="mt-1 space-y-0.5">
      <span className="text-k-text-tertiary text-[10px]">{t("sshDetectedKeys")}</span>
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onSelect(k)}
          className="flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-[11px] font-mono text-k-text-secondary hover:bg-white/[0.04] transition-colors"
        >
          <Key className="h-3 w-3 shrink-0 text-k-text-tertiary" />
          <span className="truncate">{k.replace(/^.*\/\.ssh\//, "~/.ssh/")}</span>
        </button>
      ))}
    </div>
  );
}
