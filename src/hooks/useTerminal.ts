import { useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export function useTerminal() {
  const spawned = useRef(false);

  // Spawn shell on first mount
  useEffect(() => {
    if (spawned.current) return;
    spawned.current = true;
    invoke("spawn_shell").catch((err) => {
      console.error("Failed to spawn shell:", err);
    });
  }, []);

  // Write data to PTY
  const write = useCallback((data: string) => {
    invoke("write_to_pty", { data }).catch((err) => {
      console.error("Failed to write to PTY:", err);
    });
  }, []);

  // Listen to PTY output
  const onData = useCallback((callback: (data: string) => void) => {
    let unlisten: UnlistenFn | null = null;

    listen<string>("pty-output", (event) => {
      callback(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  // Resize PTY
  const resize = useCallback((cols: number, rows: number) => {
    invoke("resize_pty", { cols, rows }).catch(() => {
      // Ignore resize errors during startup
    });
  }, []);

  return { write, onData, resize };
}
