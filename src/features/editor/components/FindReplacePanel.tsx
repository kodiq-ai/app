import { useState, useEffect, useRef, useCallback } from "react";
import { t } from "@/lib/i18n";

// ── Types ──────────────────────────────────

export interface SearchParams {
  query: string;
  caseSensitive: boolean;
  regexp: boolean;
  replace: string;
}

interface Props {
  open: boolean;
  showReplace: boolean;
  initialQuery: string;
  matchCount: number;
  currentMatch: number;
  onSearch: (params: SearchParams) => void;
  onNext: () => void;
  onPrev: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

// ── Component ──────────────────────────────

export function FindReplacePanel({
  open,
  showReplace,
  initialQuery,
  matchCount,
  currentMatch,
  onSearch,
  onNext,
  onPrev,
  onReplace,
  onReplaceAll,
  onClose,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [replaceValue, setReplaceValue] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regexp, setRegexp] = useState(false);
  const findInputRef = useRef<HTMLInputElement>(null);

  // ── Sync initial query when panel opens ──

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      requestAnimationFrame(() => {
        findInputRef.current?.focus();
        findInputRef.current?.select();
      });
    }
  }, [open, initialQuery]);

  // ── Emit search on every change ──────────

  const emitSearch = useCallback(
    (q: string, cs: boolean, re: boolean) => {
      onSearch({ query: q, caseSensitive: cs, regexp: re, replace: replaceValue });
    },
    [onSearch, replaceValue],
  );

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    emitSearch(q, caseSensitive, regexp);
  };

  const toggleCase = () => {
    const next = !caseSensitive;
    setCaseSensitive(next);
    emitSearch(query, next, regexp);
  };

  const toggleRegex = () => {
    const next = !regexp;
    setRegexp(next);
    emitSearch(query, caseSensitive, next);
  };

  // ── Keyboard handlers ────────────────────

  const handleFindKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
    }
  };

  const handleReplaceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      onReplace();
    }
  };

  if (!open) return null;

  // ── Match label ──────────────────────────

  const hasQuery = query.length > 0;
  const getMatchLabel = () => {
    if (matchCount > 0) return `${currentMatch} ${t("findReplaceOf")} ${matchCount}`;
    if (hasQuery) return t("findReplaceNoResults");
    return "";
  };
  const matchLabel = getMatchLabel();

  // ── Styles ───────────────────────────────

  const inputClass =
    "h-6 flex-1 rounded border border-white/[0.06] bg-[var(--bg-base)] px-2 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--kodiq-accent)]";
  const btnClass =
    "flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-white/[0.04] hover:text-[var(--text-secondary)]";
  const toggleOn = "bg-white/[0.06] text-[var(--text-primary)]";

  return (
    <div className="absolute top-2 right-2 z-40 w-80 rounded-md border border-white/[0.06] bg-[var(--bg-surface)] p-2 shadow-lg">
      {/* Find row */}
      <div className="flex items-center gap-1">
        <input
          ref={findInputRef}
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleFindKeyDown}
          placeholder={t("findReplaceFind")}
          className={inputClass}
        />
        <button
          title={t("findReplaceMatchCase")}
          aria-label={t("findReplaceMatchCase")}
          className={`${btnClass} ${caseSensitive ? toggleOn : ""}`}
          onClick={toggleCase}
        >
          <span className="text-[10px] font-bold">Aa</span>
        </button>
        <button
          title={t("findReplaceRegex")}
          aria-label={t("findReplaceRegex")}
          className={`${btnClass} ${regexp ? toggleOn : ""}`}
          onClick={toggleRegex}
        >
          <span className="text-[10px] font-bold">.*</span>
        </button>
        <span className="min-w-[50px] text-center text-[10px] text-[var(--text-tertiary)]">
          {matchLabel}
        </span>
        <button
          title={t("findReplacePrevious")}
          aria-label={t("findReplacePrevious")}
          className={btnClass}
          onClick={onPrev}
        >
          ↑
        </button>
        <button
          title={t("findReplaceNext")}
          aria-label={t("findReplaceNext")}
          className={btnClass}
          onClick={onNext}
        >
          ↓
        </button>
        <button
          title={t("findReplaceClose")}
          aria-label={t("findReplaceClose")}
          className={btnClass}
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="mt-1 flex items-center gap-1">
          <input
            value={replaceValue}
            onChange={(e) => setReplaceValue(e.target.value)}
            onKeyDown={handleReplaceKeyDown}
            placeholder={t("findReplaceReplace")}
            className={inputClass}
          />
          <button
            className="h-6 rounded px-2 text-[10px] text-[var(--text-secondary)] hover:bg-white/[0.04]"
            onClick={onReplace}
          >
            {t("findReplaceReplace")}
          </button>
          <button
            className="h-6 rounded px-2 text-[10px] text-[var(--text-secondary)] hover:bg-white/[0.04]"
            onClick={onReplaceAll}
          >
            {t("findReplaceReplaceAll")}
          </button>
        </div>
      )}
    </div>
  );
}
