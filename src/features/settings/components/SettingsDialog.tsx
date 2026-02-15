import { useAppStore } from "@/lib/store";
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

export function SettingsDialog() {
  const open = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const fontSizes = [11, 12, 13, 14, 15, 16];
  const shells = [
    { value: "", label: t("defaultShell") },
    { value: "/bin/zsh", label: "Zsh" },
    { value: "/bin/bash", label: "Bash" },
    { value: "/bin/fish", label: "Fish" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[420px] bg-[#141517] border-white/[0.06]">
        <DialogHeader>
          <DialogTitle className="text-[14px] text-[#e4e4e7]">{t("settings")}</DialogTitle>
          <DialogDescription className="text-[12px] text-[#52525c]">
            {t("settingsDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-2">
          {/* Shell */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] text-[#71717a] font-medium uppercase tracking-[0.06em]">{t("shell")}</label>
            <div className="flex flex-wrap gap-1.5">
              {shells.map((s) => (
                <Button
                  key={s.value}
                  variant={settings.shell === s.value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => updateSettings({ shell: s.value })}
                  className="text-[11px] h-7"
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator className="bg-white/[0.06]" />

          {/* Font size */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] text-[#71717a] font-medium uppercase tracking-[0.06em]">{t("fontSize")}</label>
            <div className="flex items-center gap-1.5">
              {fontSizes.map((size) => (
                <Button
                  key={size}
                  variant={settings.fontSize === size ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => updateSettings({ fontSize: size })}
                  className="text-[11px] h-7 w-9 font-mono"
                >
                  {size}
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-[#3f3f46]">{t("fontSizeNote")}</p>
          </div>

          <Separator className="bg-white/[0.06]" />

          {/* Info */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#3f3f46]">Kodiq v0.1.0</span>
            <span className="text-[10px] text-[#3f3f46]">{t("openSettings")}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
