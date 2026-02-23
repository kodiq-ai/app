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
      <DialogContent className="border-white/[0.06] bg-[#1A1A1D] sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[14px] text-[#E6E6E9]">
            {t("updateAvailable") ?? "Update Available"}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-[#6E6E76]">
            Kodiq v{updateAvailable.version}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-4">
          {/* Version info */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#A1A1A8]">
              {t("currentVersion") ?? "Current"}: v{updateAvailable.currentVersion}
            </span>
            <span className="font-medium text-[#4DA3C7]">→ v{updateAvailable.version}</span>
          </div>

          {/* Changelog */}
          {updateAvailable.body && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium tracking-[0.06em] text-[#6E6E76] uppercase">
                {t("whatsNew") ?? "What's new"}
              </span>
              <div className="max-h-[200px] overflow-y-auto rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-[#A1A1A8]">
                {updateAvailable.body}
              </div>
            </div>
          )}

          {/* Progress bar */}
          {downloading && (
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="h-full rounded-full bg-[#4DA3C7] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-center text-[10px] text-[#6E6E76]">{progress}%</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={downloading}
              className="text-[11px] text-[#A1A1A8]"
            >
              {t("remindLater") ?? "Remind me later"}
            </Button>
            <Button
              size="sm"
              onClick={installUpdate}
              disabled={downloading}
              className="bg-[#4DA3C7] text-[11px] text-white hover:bg-[#3E8AAD]"
            >
              {downloading
                ? `${t("downloading") ?? "Downloading"}...`
                : (t("updateNow") ?? "Update now")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
