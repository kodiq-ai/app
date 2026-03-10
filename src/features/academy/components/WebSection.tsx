// ── Web Section ──────────────────────────────────────────────────────────────
// Persistent WebView container for web-based app sections (Home, Progress,
// Feed, Leaderboard). Renders a single Rust-managed child WebView that stays
// alive across mode switches — only destroyed when returning to Developer mode.
//
// Session injection: sets BOTH cookies (@supabase/ssr format for Next.js
// middleware) AND localStorage (for client-side Supabase) via initialization_script
// that runs at document-start, BEFORE any page JS.
//
// Loading flow: WebView is created off-screen. Rust emits `academy-page-loaded`
// on `PageLoadEvent::Finished` → React restores bounds. 5 s timeout as fallback.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { academy, listen } from "@shared/lib/tauri";
import { SUPABASE_STORAGE_KEY } from "@shared/lib/constants";
import { Loader } from "@/components/Loader";

// ── Session injection script builder ────────────────────────

/** Max bytes per cookie chunk (@supabase/ssr default). */
const CHUNK_SIZE = 3180;

function buildSessionScript(session: unknown): string {
  const key = SUPABASE_STORAGE_KEY;
  const val = JSON.stringify(session);
  const keyJs = JSON.stringify(key);
  const valJs = JSON.stringify(val);

  // Runs at document-start on the target origin (kodiq.ai).
  // Sets localStorage for client-side Supabase createBrowserClient,
  // and chunked cookies for server-side @supabase/ssr middleware.
  return `
try {
  var k = ${keyJs}, v = ${valJs};
  localStorage.setItem(k, v);
  document.cookie = k + '=; path=/; max-age=0';
  for (var i = 0; i < 10; i++) document.cookie = k + '.' + i + '=; path=/; max-age=0';
  var e = encodeURIComponent(v);
  if (e.length <= ${CHUNK_SIZE}) {
    document.cookie = k + '=' + e + '; path=/; max-age=604800; SameSite=Lax';
  } else {
    for (var j = 0; j * ${CHUNK_SIZE} < e.length; j++) {
      document.cookie = k + '.' + j + '=' + e.substring(j * ${CHUNK_SIZE}, (j + 1) * ${CHUNK_SIZE}) + '; path=/; max-age=604800; SameSite=Lax';
    }
  }
} catch(x) {}`;
}

// ── Constants ────────────────────────────────────────────────

const OFFSCREEN = { x: -9999, y: -9999, width: 0, height: 0 };
const LOAD_TIMEOUT_MS = 5000;

// ── Component ───────────────────────────────────────────────

export function WebSection({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const createdRef = useRef(false);
  const loadingRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Restore webview to container bounds ─────────────────

  const restoreBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    academy.resize({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  }, []);

  // ── Exit loading state and reveal WebView ───────────────

  const showWebView = useCallback(() => {
    if (!loadingRef.current) return;
    loadingRef.current = false;
    setLoading(false);
    clearTimeout(timeoutRef.current);
    restoreBounds();
  }, [restoreBounds]);

  // ── Report bounds (skip while loading) ──────────────────

  const reportBounds = useCallback(() => {
    if (loadingRef.current) return;
    restoreBounds();
  }, [restoreBounds]);

  // ── Listen for Rust page-loaded event ───────────────────

  useEffect(() => {
    const unlistenPromise = listen("academy-page-loaded", () => showWebView());
    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, [showWebView]);

  // ── Create once, navigate on URL change ─────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Enter loading state — hide WebView off-screen
    loadingRef.current = true;
    setLoading(true);

    if (!createdRef.current) {
      // First mount: create WebView off-screen with session cookies
      const session = useAppStore.getState().academySession;
      const sessionJs = session ? buildSessionScript(session) : undefined;
      academy.navigate(url, OFFSCREEN, sessionJs);
      createdRef.current = true;
    } else {
      // URL changed: hide existing WebView, then navigate
      academy.resize(OFFSCREEN);
      academy.navigate(url, OFFSCREEN);
    }

    // Fallback: reveal after timeout even if event never arrives
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(showWebView, LOAD_TIMEOUT_MS);
  }, [url, showWebView]);

  // ── Resize observer + cleanup on unmount ────────────────

  useEffect(() => {
    const observer = new ResizeObserver(reportBounds);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutRef.current);
      academy.destroy();
      createdRef.current = false;
    };
  }, [reportBounds]);

  return (
    <div ref={containerRef} className="relative flex-1">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader size="lg" />
        </div>
      )}
    </div>
  );
}
