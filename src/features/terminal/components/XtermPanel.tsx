import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import { XTERM_THEME } from "@/lib/constants";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { createFilePathLinkProvider } from "../lib/filePathLinkProvider";
import { OutputMarkerManager } from "../lib/outputMarkers";

interface XtermPanelProps {
  termId: string;
  isActive: boolean;
}

export function XtermPanel({ termId, isActive }: XtermPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const settings = useAppStore((s) => s.settings);

  useEffect(() => {
    if (!containerRef.current || termRef.current) return;

    const term = new Terminal({
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      lineHeight: 1.35,
      letterSpacing: 0,
      theme: XTERM_THEME,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());

    // File path link provider — makes file paths clickable
    const projectPath = useAppStore.getState().projectPath;
    const linkDisposable = term.registerLinkProvider(createFilePathLinkProvider(term, projectPath));

    term.open(containerRef.current);

    // GPU-accelerated rendering via WebGL, fallback to default Canvas
    try {
      term.loadAddon(new WebglAddon());
    } catch {
      // WebGL not available — Canvas 2D renderer will be used
    }

    requestAnimationFrame(() => {
      try {
        fit.fit();
      } catch {
        /* ok */
      }
    });

    termRef.current = term;
    fitRef.current = fit;

    // Output section markers — visual dots for navigating long output
    const markerManager = new OutputMarkerManager(term);

    term.onData((data) => {
      invoke("write_to_pty", { id: termId, data }).catch(() => {});
    });

    const unlisten = listen<{ id: string; data: string }>("pty-output", (event) => {
      if (event.payload.id === termId) {
        term.write(event.payload.data);
        markerManager.onOutput(event.payload.data);
      }
    });

    const unlistenExit = listen<{ id: string }>("pty-exit", (event) => {
      if (event.payload.id === termId) {
        term.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
        const store = useAppStore.getState();
        store.markExited(termId);

        // Send macOS notification if this tab is not active
        if (store.activeTab !== termId && document.visibilityState !== "visible") {
          const tab = store.tabs.find((tb) => tb.id === termId);
          try {
            new Notification("Kodiq", {
              body: `${t("processFinished")}: ${tab?.label || t("terminal")}`,
              silent: false,
            });
          } catch {
            /* notification API not available */
          }
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
      unlistenExit.then((fn) => fn());
      markerManager.dispose();
      linkDisposable.dispose();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Terminal is created once; font settings are read at init only
  }, [termId]);

  useEffect(() => {
    if (!isActive || !fitRef.current || !termRef.current) return;

    const doFit = () => {
      try {
        fitRef.current?.fit();
        const term = termRef.current;
        if (term) {
          invoke("resize_pty", { id: termId, cols: term.cols, rows: term.rows }).catch(() => {});
        }
      } catch {
        /* ok */
      }
    };

    requestAnimationFrame(doFit);

    const ro = new ResizeObserver(doFit);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [isActive, termId]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "xterm-container absolute inset-0 flex-1 overflow-hidden",
        "motion-safe:transition-opacity motion-safe:duration-150",
        isActive ? "visible z-10 opacity-100" : "invisible z-0 opacity-0",
      )}
    />
  );
}
