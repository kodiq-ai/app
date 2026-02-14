import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { useTerminal } from "../hooks/useTerminal";

const THEME = {
  background: "#0d0d0d",
  foreground: "#d4d4d4",
  cursor: "#14b8a6",
  cursorAccent: "#0d0d0d",
  selectionBackground: "#14b8a625",
  selectionForeground: "#e5e5e5",
  black: "#1a1a1a",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#fbbf24",
  blue: "#60a5fa",
  magenta: "#c084fc",
  cyan: "#22d3ee",
  white: "#d4d4d4",
  brightBlack: "#737373",
  brightRed: "#fca5a5",
  brightGreen: "#86efac",
  brightYellow: "#fde68a",
  brightBlue: "#93c5fd",
  brightMagenta: "#d8b4fe",
  brightCyan: "#67e8f9",
  brightWhite: "#fafafa",
};

interface TerminalProps {
  terminalId: string | null;
  isActive: boolean;
}

export default function Terminal({ terminalId, isActive }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { write, onData, onExit, resize } = useTerminal(terminalId);

  useEffect(() => {
    if (!containerRef.current || !terminalId) return;

    const term = new XTerm({
      theme: THEME,
      fontSize: 13,
      lineHeight: 1.4,
      fontFamily:
        "'SF Mono', 'JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
      fontWeight: "400",
      fontWeightBold: "600",
      cursorBlink: true,
      cursorStyle: "bar",
      cursorWidth: 2,
      scrollback: 10000,
      allowProposedApi: true,
      macOptionIsMeta: true,
      drawBoldTextInBrightColors: false,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);

    requestAnimationFrame(() => {
      fitAddon.fit();
      term.focus();
    });

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // User types -> send to PTY
    term.onData((data) => {
      write(data);
    });

    // PTY output -> write to terminal
    const cleanupData = onData((data: string) => {
      term.write(data);
    });

    // PTY exit -> show message
    const cleanupExit = onExit(() => {
      term.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
    });

    // Resize observer
    let resizeTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        requestAnimationFrame(() => {
          fitAddon.fit();
          resize(term.cols, term.rows);
        });
      }, 150);
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      clearTimeout(resizeTimer);
      cleanupData();
      cleanupExit();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [terminalId]);

  // Focus terminal when it becomes active
  useEffect(() => {
    if (isActive && termRef.current) {
      termRef.current.focus();
      fitAddonRef.current?.fit();
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{
        padding: 0,
        margin: 0,
        display: isActive ? "block" : "none",
      }}
    />
  );
}
