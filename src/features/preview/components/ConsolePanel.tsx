// ── Console Panel ────────────────────────────────────────────────────────────
// DevTools console — renders captured console logs from the preview webview.
// Positioned below the preview area in the right column.

import { useRef, useEffect, useCallback, useState } from "react";
import { Trash2, ChevronDown, ArrowDownToLine } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { ConsoleLevel, ConsoleEntry } from "@shared/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { t } from "@/lib/i18n";

// -- Level Config ────────────────────────────────────────────
const LEVEL_CONFIG: Record<ConsoleLevel, { color: string; badge: string }> = {
  log: { color: "text-k-text-secondary", badge: "text-k-text-tertiary" },
  info: { color: "text-sky-400", badge: "text-sky-400/70" },
  warn: { color: "text-amber-400", badge: "text-amber-400/70" },
  error: { color: "text-red-400", badge: "text-red-400/70" },
  debug: { color: "text-k-text-tertiary", badge: "text-k-text-tertiary" },
};

const FILTER_OPTIONS: { value: ConsoleLevel | "all"; label: string }[] = [
  { value: "all", label: "filterAll" },
  { value: "error", label: "filterErrors" },
  { value: "warn", label: "filterWarnings" },
  { value: "log", label: "filterLogs" },
  { value: "info", label: "filterInfo" },
  { value: "debug", label: "filterDebug" },
];

// -- Serialization ───────────────────────────────────────────
function serializeArg(arg: unknown): string {
  if (arg === null) return "null";
  if (arg === undefined || arg === "__undefined__") return "undefined";
  if (typeof arg === "string") return arg;
  if (typeof arg === "number" || typeof arg === "boolean") return String(arg);
  if (typeof arg === "object") {
    const obj = arg as Record<string, unknown>;
    if (obj.__type === "Error") return `${obj.message}`;
    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function formatArgs(args: unknown[]): string {
  return args.map(serializeArg).join(" ");
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

// -- Log Entry Component ─────────────────────────────────────
function LogEntry({ entry }: { entry: ConsoleEntry }) {
  const config = LEVEL_CONFIG[entry.level] ?? LEVEL_CONFIG.log;
  const [expanded, setExpanded] = useState(false);
  const text = formatArgs(entry.args);
  const isMultiline = text.includes("\n") || text.length > 200;

  return (
    <div
      className={cn(
        "group flex gap-2 border-b border-white/[0.03] px-2 py-[3px] font-mono text-[11px] leading-[18px]",
        entry.level === "error" && "bg-red-500/[0.04]",
        entry.level === "warn" && "bg-amber-500/[0.04]",
      )}
    >
      {/* Timestamp */}
      <span className="text-k-text-tertiary shrink-0 tabular-nums select-none">
        {formatTime(entry.timestamp)}
      </span>

      {/* Level badge */}
      <span className={cn("w-[3ch] shrink-0 text-right uppercase select-none", config.badge)}>
        {entry.level === "log" ? "" : entry.level.slice(0, 3)}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <pre
          className={cn(
            "break-all whitespace-pre-wrap",
            config.color,
            !expanded && isMultiline && "line-clamp-3 cursor-pointer",
          )}
          onClick={isMultiline ? () => setExpanded((p) => !p) : undefined}
        >
          {text}
        </pre>

        {/* Stack trace (errors) */}
        {entry.stack && expanded && (
          <pre className="text-k-text-tertiary mt-0.5 text-[10px] leading-[16px] break-all whitespace-pre-wrap">
            {entry.stack}
          </pre>
        )}

        {/* Expand indicator */}
        {isMultiline && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-k-text-tertiary hover:text-k-text-secondary mt-0.5 text-[10px]"
          >
            <ChevronDown className="inline size-2.5" /> {t("andMore")}
          </button>
        )}
      </div>
    </div>
  );
}

// -- ConsolePanel ────────────────────────────────────────────
export function ConsolePanel() {
  const consoleLogs = useAppStore((s) => s.consoleLogs);
  const consoleFilter = useAppStore((s) => s.consoleFilter);
  const setConsoleFilter = useAppStore((s) => s.setConsoleFilter);
  const clearConsole = useAppStore((s) => s.clearConsole);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // -- Filtered logs ─────────────────────────────────────────
  const filtered =
    consoleFilter === "all" ? consoleLogs : consoleLogs.filter((e) => e.level === consoleFilter);

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

  const logCount = filtered.length;
  const errorCount = consoleLogs.filter((e) => e.level === "error").length;
  const warnCount = consoleLogs.filter((e) => e.level === "warn").length;

  return (
    <div className="flex flex-col overflow-hidden border-t border-white/[0.06]">
      {/* Toolbar */}
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-white/[0.06] px-2">
        {/* Filter buttons */}
        <div className="flex items-center gap-px">
          {FILTER_OPTIONS.map(({ value, label }) => {
            const isActive = consoleFilter === value;
            let count: number | null = null;
            if (value === "error") count = errorCount;
            else if (value === "warn") count = warnCount;

            return (
              <button
                key={value}
                onClick={() => setConsoleFilter(value)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-k-text-secondary bg-white/[0.06]"
                    : "text-k-text-tertiary hover:text-k-text-secondary",
                )}
              >
                {t(label)}
                {count !== null && count > 0 && (
                  <span
                    className={cn(
                      "ml-0.5",
                      value === "error" && "text-red-400/70",
                      value === "warn" && "text-amber-400/70",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Log count */}
        <span className="text-k-text-tertiary text-[10px] tabular-nums">
          {logCount} {t("logs")}
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
            <TooltipContent>{t("scrollToBottom")}</TooltipContent>
          </Tooltip>
        )}

        {/* Clear */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={clearConsole}
              className="text-k-text-tertiary hover:text-k-text-secondary"
              aria-label={t("clearConsole")}
            >
              <Trash2 className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("clearConsole")}</TooltipContent>
        </Tooltip>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-x-hidden overflow-y-auto"
        style={{ minHeight: 80, maxHeight: 300 }}
      >
        {filtered.length === 0 ? (
          <div className="text-k-text-tertiary flex h-full items-center justify-center text-[11px]">
            {t("noConsoleLogs")}
          </div>
        ) : (
          filtered.map((entry) => <LogEntry key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}
