// ── Update Checker Hook ──────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import type { UpdateInfo } from "@shared/lib/types";

// Dynamic imports to avoid errors if plugins aren't available at dev time
let checkModule: typeof import("@tauri-apps/plugin-updater") | null = null;
let processModule: typeof import("@tauri-apps/plugin-process") | null = null;

async function loadModules() {
  try {
    checkModule = await import("@tauri-apps/plugin-updater");
    processModule = await import("@tauri-apps/plugin-process");
  } catch {
    // Plugins not available (web dev mode)
  }
}

export function useUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const checkForUpdate = useCallback(async () => {
    try {
      if (!checkModule) await loadModules();
      if (!checkModule) return;

      const update = await checkModule.check();
      if (update) {
        setUpdateAvailable({
          version: update.version,
          currentVersion: update.currentVersion,
          body: update.body ?? null,
          date: update.date ?? null,
        });
      }
    } catch (e) {
      console.error("Update check failed:", e);
      // Silently fail — user shouldn't be bothered if offline
    }
  }, []);

  // Check on app start + every 4 hours
  useEffect(() => {
    checkForUpdate();
    const interval = setInterval(checkForUpdate, 4 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  const installUpdate = useCallback(async () => {
    try {
      if (!checkModule) await loadModules();
      if (!checkModule) return;

      const update = await checkModule.check();
      if (!update) return;

      setDownloading(true);
      let totalSize = 0;
      let downloaded = 0;

      await update.download((event) => {
        if (event.event === "Started") {
          totalSize = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (totalSize > 0) {
            setProgress(Math.round((downloaded / totalSize) * 100));
          }
        }
      });

      await update.install();

      if (processModule) {
        await processModule.relaunch();
      }
    } catch (e) {
      console.error("Update install failed:", e);
      setDownloading(false);
    }
  }, []);

  return { updateAvailable, downloading, progress, installUpdate, checkForUpdate };
}
