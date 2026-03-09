// ── Web Section ──────────────────────────────────────────────────────────────
// Persistent WebView container for web-based app sections (Home, Progress,
// Feed, Leaderboard). Renders a single Rust-managed child WebView that stays
// alive across mode switches — only destroyed when returning to Developer mode.
//
// Session injection: sets BOTH cookies (@supabase/ssr format for Next.js
// middleware) AND localStorage (for client-side Supabase) via initialization_script
// that runs at document-start, BEFORE any page JS.

import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { academy } from "@shared/lib/tauri";
import { SUPABASE_STORAGE_KEY } from "@shared/lib/constants";

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

// ── Component ───────────────────────────────────────────────

export function WebSection({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const createdRef = useRef(false);

  // ── Report bounds to Rust WebView ──────────────────────

  const reportBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    academy.resize({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  }, []);

  // ── Create once, navigate on URL change ────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const bounds = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };

    if (!createdRef.current) {
      // First mount: create WebView with session cookies
      const session = useAppStore.getState().academySession;
      const sessionJs = session ? buildSessionScript(session) : undefined;
      academy.navigate(url, bounds, sessionJs);
      createdRef.current = true;
    } else {
      // URL changed: reuse existing WebView (cookies persist on same origin)
      academy.navigate(url, bounds);
    }
  }, [url]);

  // ── Resize observer + cleanup on unmount ───────────────

  useEffect(() => {
    const observer = new ResizeObserver(reportBounds);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      academy.destroy();
      createdRef.current = false;
    };
  }, [reportBounds]);

  return <div ref={containerRef} className="relative flex-1" />;
}
