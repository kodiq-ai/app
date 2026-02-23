import { useRef, useEffect, useCallback } from "react";
import { RefreshCw, Monitor, Tablet, Smartphone, Zap, Globe, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Viewport } from "@shared/lib/types";
import { preview } from "@shared/lib/tauri";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { t } from "@/lib/i18n";

// -- Viewport Dimensions ─────────────────────────────────
const VIEWPORT_SIZES: Record<Viewport, { width?: number; height?: number }> = {
  desktop: {},
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

function getViewportStyle(viewport: Viewport): React.CSSProperties {
  const size = VIEWPORT_SIZES[viewport];
  if (!size.width) return { width: "100%", height: "100%" };
  return {
    width: size.width,
    height: "100%",
    maxHeight: size.height,
    borderRadius: viewport === "mobile" ? 12 : 8,
    boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
  };
}

// -- ActivePanel ─────────────────────────────────────────
export function ActivePanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewport = useAppStore((s) => s.viewport);
  const setViewport = useAppStore((s) => s.setViewport);
  const previewUrl = useAppStore((s) => s.previewUrl);
  const webviewReady = useAppStore((s) => s.webviewReady);
  const setWebviewReady = useAppStore((s) => s.setWebviewReady);
  const updateWebviewBounds = useAppStore((s) => s.updateWebviewBounds);
  const destroyWebview = useAppStore((s) => s.destroyWebview);

  // -- Report bounds to Rust ───────────────────────────────
  const reportBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Account for device pixel ratio — Tauri uses logical pixels
    updateWebviewBounds({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
  }, [updateWebviewBounds]);

  // -- ResizeObserver: keep webview positioned over placeholder
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !webviewReady) return;

    const observer = new ResizeObserver(() => reportBounds());
    observer.observe(el);

    // Also report on scroll (bounds change relative to window)
    window.addEventListener("scroll", reportBounds, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", reportBounds);
    };
  }, [webviewReady, reportBounds]);

  // -- Create / navigate webview when URL changes ──────────
  useEffect(() => {
    if (!previewUrl) return;

    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const bounds = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };

    preview
      .navigate(previewUrl, bounds)
      .then(() => setWebviewReady(true))
      .catch((e) => console.error("[Preview] navigate:", e));
  }, [previewUrl, setWebviewReady]);

  // -- Destroy webview on unmount ──────────────────────────
  useEffect(() => {
    return () => {
      if (webviewReady) {
        preview.destroy().catch((e) => console.error("[Preview] cleanup:", e));
      }
    };
  }, [webviewReady]);

  // -- Viewport options ────────────────────────────────────
  const viewportOptions: { v: Viewport; icon: typeof Monitor; label: string }[] = [
    { v: "desktop", icon: Monitor, label: t("desktop") },
    { v: "tablet", icon: Tablet, label: t("tablet") },
    { v: "mobile", icon: Smartphone, label: t("mobile") },
  ];

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[var(--bg-base)]">
      {/* Toolbar */}
      <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-white/[0.06] px-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => preview.reload().catch(console.error)}
              aria-label="refresh preview"
              className="text-k-text-tertiary hover:text-k-text-secondary"
            >
              <RefreshCw className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("refresh")}</TooltipContent>
        </Tooltip>

        <Input
          type="text"
          value={previewUrl ?? ""}
          readOnly
          placeholder={t("waitingForServer")}
          className="text-k-text-secondary focus:border-k-accent/40 h-7 flex-1 border-white/[0.06] bg-white/[0.015] px-2.5 font-mono text-[11px]"
        />

        <div className="flex shrink-0 items-center gap-px">
          {viewportOptions.map(({ v, icon: Icon, label }) => (
            <Tooltip key={v}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setViewport(v)}
                  aria-label={label}
                  className={cn(
                    "text-k-text-tertiary hover:text-k-text-secondary",
                    viewport === v && "!text-k-text-secondary bg-white/[0.04]",
                  )}
                >
                  <Icon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {previewUrl ? (
          <>
            <div className="text-k-accent flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium">
              <Zap className="size-2" />
              native
            </div>
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/80" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={destroyWebview}
                  className="text-k-text-tertiary hover:text-red-400"
                  aria-label="close preview"
                >
                  <X className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("close")}</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <div className="bg-k-border h-1.5 w-1.5 shrink-0 rounded-full" />
        )}
      </div>

      {/* Preview content — native webview is positioned over this div by Rust */}
      <div className="relative flex-1 overflow-hidden">
        {previewUrl ? (
          <div className="flex h-full w-full items-center justify-center">
            <div
              ref={containerRef}
              className="bg-white"
              style={getViewportStyle(viewport)}
              data-preview-container
            />
          </div>
        ) : (
          <div className="flex h-full flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <Globe className="text-k-border size-5" />
              <div>
                <p className="text-k-text-tertiary text-[12px]">{t("serverNotRunning")}</p>
                <p className="text-k-border mt-1 text-[11px]">
                  {t("runDevServer")}{" "}
                  <code className="text-k-text-tertiary font-mono">{t("npmRunDev")}</code>{" "}
                  {t("inTerminal")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
