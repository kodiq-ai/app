import { useState, useEffect, useRef, useCallback } from "react";
import { t } from "@/lib/i18n";

// ── Types ──────────────────────────────────────────

interface Props {
  open: boolean;
  totalLines: number;
  onJump: (line: number) => void;
  onClose: () => void;
}

// ── GoToLineDialog ─────────────────────────────────

export function GoToLineDialog({ open, totalLines, onJump, onClose }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) return;
        const clamped = Math.max(1, Math.min(parsed, totalLines));
        onJump(clamped);
        onClose();
      }
    },
    [value, totalLines, onJump, onClose],
  );

  if (!open) return null;

  const placeholder = t("goToLinePlaceholder").replace("{max}", String(totalLines));

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-[20%]">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />
      {/* Dialog */}
      <div className="relative z-10 w-64 rounded-md border border-white/[0.06] bg-[var(--bg-surface)] p-2 shadow-lg">
        <div className="mb-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
          {t("goToLineTitle")}
        </div>
        <input
          ref={inputRef}
          role="textbox"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded border border-white/[0.06] bg-[var(--bg-base)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--kodiq-accent)]"
        />
      </div>
    </div>
  );
}
