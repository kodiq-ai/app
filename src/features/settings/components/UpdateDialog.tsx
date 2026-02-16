// ── Update Dialog ────────────────────────────────────────────────────────────
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { t } from "@shared/i18n";
import { useAppStore } from "@/store";
import { useUpdateChecker } from "../hooks/useUpdateChecker";

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateDialog({ open, onOpenChange }: UpdateDialogProps) {
  const updateAvailable = useAppStore((s) => s.updateAvailable);
  const downloading = useAppStore((s) => s.downloading);
  const progress = useAppStore((s) => s.downloadProgress);
  const { installUpdate } = useUpdateChecker();

  if (!updateAvailable) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-[#141517] border-white/[0.06]">
        <DialogHeader>
          <DialogTitle className="text-[14px] text-[#e4e4e7]">
            {t("updateAvailable") ?? "Update Available"}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-[#52525c]">
            Kodiq v{updateAvailable.version}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Version info */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#71717a]">{t("currentVersion") ?? "Current"}: v{updateAvailable.currentVersion}</span>
            <span className="text-[#14b8a6] font-medium">→ v{updateAvailable.version}</span>
          </div>

          {/* Changelog */}
          {updateAvailable.body && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-[#52525c] font-medium uppercase tracking-[0.06em]">
                {t("whatsNew") ?? "What's new"}
              </span>
              <div className="text-[11px] text-[#a1a1aa] leading-relaxed max-h-[200px] overflow-y-auto px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                {updateAvailable.body}
              </div>
            </div>
          )}

          {/* Progress bar */}
          {downloading && (
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#14b8a6] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-[#52525c] text-center">{progress}%</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={downloading}
              className="text-[11px] text-[#71717a]"
            >
              {t("remindLater") ?? "Remind me later"}
            </Button>
            <Button
              size="sm"
              onClick={installUpdate}
              disabled={downloading}
              className="text-[11px] bg-[#14b8a6] hover:bg-[#0d9488] text-white"
            >
              {downloading ? `${t("downloading") ?? "Downloading"}...` : t("updateNow") ?? "Update now"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
