import { useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

interface PtyOutput {
  id: string;
  data: string;
}

interface PtyExit {
  id: string;
}

export interface CliTool {
  bin: string;
  name: string;
  provider: string;
  installed: boolean;
  version: string;
}

/**
 * Hook for a single terminal instance bound to a specific PTY id
 */
export function useTerminal(terminalId: string | null) {
  const listenerRef = useRef<UnlistenFn | null>(null);

  // Write data to this terminal's PTY
  const write = useCallback(
    (data: string) => {
      if (!terminalId) return;
      invoke("write_to_pty", { id: terminalId, data }).catch((err) => {
        console.error("Failed to write to PTY:", err);
      });
    },
    [terminalId],
  );

  // Listen to this terminal's PTY output
  const onData = useCallback(
    (callback: (data: string) => void) => {
      if (!terminalId) return () => {};

      let unlisten: UnlistenFn | null = null;

      listen<PtyOutput>("pty-output", (event) => {
        if (event.payload.id === terminalId) {
          callback(event.payload.data);
        }
      }).then((fn) => {
        unlisten = fn;
      });

      return () => {
        unlisten?.();
      };
    },
    [terminalId],
  );

  // Listen to terminal exit
  const onExit = useCallback(
    (callback: () => void) => {
      if (!terminalId) return () => {};

      let unlisten: UnlistenFn | null = null;

      listen<PtyExit>("pty-exit", (event) => {
        if (event.payload.id === terminalId) {
          callback();
        }
      }).then((fn) => {
        unlisten = fn;
      });

      return () => {
        unlisten?.();
      };
    },
    [terminalId],
  );

  // Resize this terminal's PTY
  const resize = useCallback(
    (cols: number, rows: number) => {
      if (!terminalId) return;
      invoke("resize_pty", { id: terminalId, cols, rows }).catch(() => {});
    },
    [terminalId],
  );

  return { write, onData, onExit, resize };
}

/**
 * Spawn a new terminal (shell or CLI command)
 */
export async function spawnTerminal(
  command?: string,
  cwd?: string,
): Promise<string> {
  return invoke<string>("spawn_terminal", { command: command || null, cwd: cwd || null });
}

/**
 * Close a terminal
 */
export async function closeTerminal(id: string): Promise<void> {
  return invoke("close_terminal", { id });
}

/**
 * Detect installed CLI tools
 */
export async function detectCliTools(): Promise<CliTool[]> {
  return invoke<CliTool[]>("detect_cli_tools");
}
