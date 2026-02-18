// ── Unsaved Changes Dialog ──────────────────────────────────────────────────
// shadcn AlertDialog: Save & Close / Discard / Cancel.

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { t } from "@/lib/i18n";

interface Props {
  open: boolean;
  fileName: string;
  onSaveAndClose: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedDialog({ open, fileName, onSaveAndClose, onDiscard, onCancel }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm">{t("unsavedChanges")}</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            <span className="font-medium text-[var(--text-primary)]">{fileName}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="sm" onClick={onCancel}>
            {t("cancelClose")}
          </AlertDialogCancel>
          <AlertDialogAction size="sm" variant="outline" onClick={onDiscard}>
            {t("discardAndClose")}
          </AlertDialogAction>
          <AlertDialogAction size="sm" onClick={onSaveAndClose}>
            {t("saveAndClose")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
