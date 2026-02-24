// ── Network Panel ──────────────────────────────────────────────────────────
// DevTools network — renders captured fetch/XHR requests from the preview webview.
// Positioned below the preview area in the right column (inside tabbed DevTools).

import { useRef, useEffect, useCallback, useState } from "react";
import { Trash2, ChevronDown, ArrowDownToLine } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { NetworkEntry } from "@shared/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { t } from "@/lib/i18n";

// -- Method Config ────────────────────────────────────────
const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-sky-400",
  PUT: "text-amber-400",
  PATCH: "text-violet-400",
  DELETE: "text-red-400",
  HEAD: "text-k-text-tertiary",
  OPTIONS: "text-k-text-tertiary",
};

type TypeFilter = "all" | "fetch" | "xhr";

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fetch", label: "Fetch" },
  { value: "xhr", label: "XHR" },
];

// -- Helpers ──────────────────────────────────────────────
function getStatusColor(status: number | null): string {
  if (status === null) return "text-k-text-tertiary";
  if (status >= 500) return "text-red-400";
  if (status >= 400) return "text-amber-400";
  if (status >= 300) return "text-sky-400";
  if (status >= 200) return "text-emerald-400";
  return "text-k-text-secondary";
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "…";
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function extractPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

// -- Request Entry Component ──────────────────────────────
function RequestEntry({ entry }: { entry: NetworkEntry }) {
  const [expanded, setExpanded] = useState(false);
  const methodColor = METHOD_COLORS[entry.method.toUpperCase()] ?? "text-k-text-secondary";
  const statusColor = getStatusColor(entry.status);
  const isError = entry.error !== null || (entry.status !== null && entry.status >= 400);

  return (
    <div
      className={cn(
        "group border-b border-white/[0.03] font-mono text-[11px] leading-[18px]",
        isError && "bg-red-500/[0.04]",
      )}
    >
      {/* Main row */}
      <div
        className="flex cursor-pointer items-center gap-2 px-2 py-[3px] hover:bg-white/[0.02]"
        onClick={() => setExpanded((p) => !p)}
      >
        <span className="text-k-text-tertiary shrink-0 tabular-nums select-none">
          {formatTime(entry.startTime)}
        </span>
        <span className={cn("w-[5ch] shrink-0 font-semibold uppercase", methodColor)}>
          {entry.method}
        </span>
        <span className={cn("w-[3ch] shrink-0 text-right tabular-nums", statusColor)}>
          {entry.status ?? "—"}
        </span>
        <span className="text-k-text-secondary min-w-0 flex-1 truncate">
          {extractPath(entry.url)}
        </span>
        <span className="text-k-text-tertiary shrink-0 text-[9px] uppercase">{entry.type}</span>
        <span className="text-k-text-tertiary w-[5ch] shrink-0 text-right tabular-nums">
          {formatDuration(entry.duration)}
        </span>
        <span className="text-k-text-tertiary w-[6ch] shrink-0 text-right tabular-nums">
          {formatSize(entry.responseSize)}
        </span>
        <ChevronDown
          className={cn(
            "text-k-text-tertiary size-2.5 shrink-0 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/[0.03] px-2 py-1.5 text-[10px]">
          <div className="text-k-text-tertiary mb-1">
            <span className="text-k-text-secondary">{entry.method}</span>{" "}
            <span className="break-all">{entry.url}</span>
          </div>
          {entry.error && <div className="text-red-400">Error: {entry.error}</div>}
          {entry.statusText && (
            <div className="text-k-text-tertiary">
              Status: <span className={statusColor}>{entry.status}</span> {entry.statusText}
            </div>
          )}
          {entry.duration !== null && (
            <div className="text-k-text-tertiary">Duration: {formatDuration(entry.duration)}</div>
          )}
          {entry.responseSize !== null && (
            <div className="text-k-text-tertiary">Size: {formatSize(entry.responseSize)}</div>
          )}
        </div>
      )}
    </div>
  );
}

// -- NetworkPanel ─────────────────────────────────────────
export function NetworkPanel() {
  const networkEntries = useAppStore((s) => s.networkEntries);
  const clearNetwork = useAppStore((s) => s.clearNetwork);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // -- Filtered entries ─────────────────────────────────────
  const filtered =
    typeFilter === "all" ? networkEntries : networkEntries.filter((e) => e.type === typeFilter);

  const fetchCount = networkEntries.filter((e) => e.type === "fetch").length;
  const xhrCount = networkEntries.filter((e) => e.type === "xhr").length;

  // -- Auto-scroll to bottom on new entries ──────────────────
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [filtered.length, autoScroll]);

  // -- Detect manual scroll-up → disable auto-scroll ─────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    setAutoScroll(isAtBottom);
  }, []);

  return (
    <div className="flex flex-col overflow-hidden border-t border-white/[0.06]">
      {/* Toolbar */}
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-white/[0.06] px-2">
        {/* Filter buttons */}
        <div className="flex items-center gap-px">
          {TYPE_FILTERS.map(({ value, label }) => {
            const isActive = typeFilter === value;
            let count: number | null = null;
            if (value === "fetch") count = fetchCount;
            else if (value === "xhr") count = xhrCount;

            return (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-k-text-secondary bg-white/[0.06]"
                    : "text-k-text-tertiary hover:text-k-text-secondary",
                )}
              >
                {label}
                {count !== null && count > 0 && (
                  <span className="text-k-text-tertiary ml-0.5">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Request count */}
        <span className="text-k-text-tertiary text-[10px] tabular-nums">
          {filtered.length} requests
        </span>

        {/* Scroll to bottom */}
        {!autoScroll && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setAutoScroll(true);
                  const el = scrollRef.current;
                  if (el) el.scrollTop = el.scrollHeight;
                }}
                className="text-k-text-tertiary hover:text-k-text-secondary"
                aria-label={t("scrollToBottom")}
              >
                <ArrowDownToLine className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Scroll to bottom</TooltipContent>
          </Tooltip>
        )}

        {/* Clear */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={clearNetwork}
              className="text-k-text-tertiary hover:text-k-text-secondary"
              aria-label={t("clearNetwork")}
            >
              <Trash2 className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("clearNetwork")}</TooltipContent>
        </Tooltip>
      </div>

      {/* Request entries */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-x-hidden overflow-y-auto"
        style={{ minHeight: 80, maxHeight: 300 }}
      >
        {filtered.length === 0 ? (
          <div className="text-k-text-tertiary flex h-full items-center justify-center text-[11px]">
            {t("noNetworkRequests")}
          </div>
        ) : (
          filtered.map((entry) => <RequestEntry key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}
