// ── Feed View ────────────────────────────────────────────────────────────────
// Main container for Feed mode. Shows AuthPrompt or WebView.

import { useCallback, useEffect, useRef } from "react";
import { ArrowLeft, RotateCw } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { academy } from "@shared/lib/tauri";
import { FEED_URL, SUPABASE_STORAGE_KEY } from "@shared/lib/constants";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { AuthPrompt } from "./AuthPrompt";

export function FeedView() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const academySession = useAppStore((s) => s.academySession);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Report bounds to Rust WebView ──────────────────────

  const reportBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    academy.resize({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  // ── Navigate on mount, destroy on unmount ──────────────

  useEffect(() => {
    if (!isAuthenticated) return;

    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    academy.navigate(FEED_URL, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });

    // Inject session into WebView localStorage using the correct Supabase storage key
    if (academySession) {
      const sessionPayload = JSON.stringify(academySession);
      academy.executeJs(
        `try { localStorage.setItem(${JSON.stringify(SUPABASE_STORAGE_KEY)}, ${JSON.stringify(sessionPayload)}); } catch(e) {}`,
      );
    }

    // Resize observer
    const observer = new ResizeObserver(reportBounds);
    observer.observe(el);

    return () => {
      observer.disconnect();
      academy.destroy();
    };
  }, [isAuthenticated, academySession, reportBounds]);

  // ── Not authenticated → show login ─────────────────────

  if (!isAuthenticated) {
    return <AuthPrompt description={t("feedNotAuthenticated")} />;
  }

  // ── Authenticated → WebView container ──────────────────

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-white/[0.06] px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => academy.executeJs("history.back()")}
          className="text-k-text-tertiary hover:text-k-text-secondary h-6 w-6 p-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => academy.reload()}
          className="text-k-text-tertiary hover:text-k-text-secondary h-6 w-6 p-0"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </Button>
        <span className="text-k-text-tertiary ml-2 truncate text-xs">{FEED_URL}</span>
      </div>

      {/* WebView container — Rust child webview renders here */}
      <div ref={containerRef} className="relative flex-1" data-feed-container />
    </div>
  );
}
