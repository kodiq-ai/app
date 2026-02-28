import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Modal dialog that prompts for SSH password or key passphrase. */
export function SshPasswordPrompt() {
  const prompt = useAppStore((s) => s.passwordPrompt);
  const resolvePassword = useAppStore((s) => s.sshResolvePassword);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prompt) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [prompt]);

  if (!prompt) return null;

  const isPassphrase = prompt.config.authMethod === "key";
  const label = isPassphrase ? t("sshEnterPassphrase") : t("sshEnterPassword");
  const subtitle = `${prompt.config.username}@${prompt.config.host}:${prompt.config.port}`;

  const handleSubmit = () => {
    resolvePassword(value);
  };

  const handleCancel = () => {
    resolvePassword(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-k-bg-elevated border-k-border w-[380px] rounded-lg border p-5 shadow-xl">
        <h3 className="text-k-text-primary mb-1 text-sm font-semibold">{label}</h3>
        <p className="text-k-text-tertiary mb-4 text-xs font-mono">{subtitle}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Input
            ref={inputRef}
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isPassphrase ? t("sshPassphrase") : t("sshPassword")}
            className="mb-4"
            autoComplete="off"
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              {t("sshCancel")}
            </Button>
            <Button type="submit" size="sm">
              {t("sshConnect")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
