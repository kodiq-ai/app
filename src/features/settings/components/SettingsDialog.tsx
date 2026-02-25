import { useAppStore } from "@/lib/store";
import { open } from "@tauri-apps/plugin-shell";
import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { t } from "@/lib/i18n";
import { CLI_COLORS, CLI_INSTALL_URLS } from "@shared/lib/constants";

export function SettingsDialog() {
  const isOpen = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const cliTools = useAppStore((s) => s.cliTools);

  const fontSizes = [11, 12, 13, 14, 15, 16];
  const shells = [
    { value: "", label: t("defaultShell") },
    { value: "/bin/zsh", label: "Zsh" },
    { value: "/bin/bash", label: "Bash" },
    { value: "/bin/fish", label: "Fish" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="bg-k-bg-surface border-white/[0.06] sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-k-text text-[14px]">{t("settings")}</DialogTitle>
          <DialogDescription className="text-k-text-tertiary text-[12px]">
            {t("settingsDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-5">
          {/* Shell */}
          <div className="flex flex-col gap-2">
            <label className="text-k-text-secondary text-[11px] font-medium tracking-[0.06em] uppercase">
              {t("shell")}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {shells.map((s) => (
                <Button
                  key={s.value}
                  variant={settings.shell === s.value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => updateSettings({ shell: s.value })}
                  className="h-7 text-[11px]"
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator className="bg-white/[0.06]" />

          {/* Font size */}
          <div className="flex flex-col gap-2">
            <label className="text-k-text-secondary text-[11px] font-medium tracking-[0.06em] uppercase">
              {t("fontSize")}
            </label>
            <div className="flex items-center gap-1.5">
              {fontSizes.map((size) => (
                <Button
                  key={size}
                  variant={settings.fontSize === size ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => updateSettings({ fontSize: size })}
                  className="h-7 w-9 font-mono text-[11px]"
                >
                  {size}
                </Button>
              ))}
            </div>
            <p className="text-k-border text-[10px]">{t("fontSizeNote")}</p>
          </div>

          <Separator className="bg-white/[0.06]" />

          {/* AI Tools */}
          {cliTools.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-k-text-secondary text-[11px] font-medium tracking-[0.06em] uppercase">
                {t("aiTools")}
              </label>
              <div className="flex flex-col gap-px">
                {cliTools.map((tool) => (
                  <div key={tool.bin} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                    {tool.installed ? (
                      <div
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                        style={{ background: CLI_COLORS[tool.provider] }}
                      >
                        <Check className="size-2.5 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div
                        className="h-4 w-4 shrink-0 rounded-full opacity-25"
                        style={{ background: CLI_COLORS[tool.provider] }}
                      />
                    )}
                    <span
                      className={`flex-1 text-[12px] ${tool.installed ? "text-k-text" : "text-k-text-tertiary"}`}
                    >
                      {tool.name}
                    </span>
                    {tool.installed ? (
                      <span className="text-k-text-tertiary font-mono text-[10px]">
                        {tool.version}
                      </span>
                    ) : (
                      CLI_INSTALL_URLS[tool.bin] && (
                        <Button
                          variant="ghost"
                          onClick={() => open(CLI_INSTALL_URLS[tool.bin] ?? "")}
                          className="text-k-accent hover:bg-k-accent/10 hover:text-k-accent h-6 gap-1 rounded-md px-2 text-[10px] font-medium"
                        >
                          {t("onboardingCliInstall")}
                          <ExternalLink className="size-2.5" />
                        </Button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-white/[0.06]" />

          {/* Info */}
          <div className="flex items-center justify-between">
            <span className="text-k-border text-[10px]">Kodiq v{__APP_VERSION__}</span>
            <span className="text-k-border text-[10px]">{t("openSettings")}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
