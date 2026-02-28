import { useEffect, useState } from "react";
import { homeDir } from "@tauri-apps/api/path";
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
    (async () => {
      try {
        const home = await homeDir();
        const sshDir = `${home}.ssh`;

        const entries = await fs.readDir(sshDir);
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
      } catch {
        setKeys([]);
      } finally {
        setLoading(false);
      }
    })();
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
          className="text-k-text-secondary flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left font-mono text-[11px] transition-colors hover:bg-white/[0.04]"
        >
          <Key className="text-k-text-tertiary h-3 w-3 shrink-0" />
          <span className="truncate">{k.replace(/^.*\/\.ssh\//, "~/.ssh/")}</span>
        </button>
      ))}
    </div>
  );
}
