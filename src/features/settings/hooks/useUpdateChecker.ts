// ── Update Checker Hook ──────────────────────────────────────────────────────
import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store";
import { t } from "@shared/i18n";

// Dynamic imports to avoid errors if plugins aren't available at dev time
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- dynamic import() type needed for lazy plugin loading
type UpdaterModule = typeof import("@tauri-apps/plugin-updater");
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- dynamic import() type needed for lazy plugin loading
type ProcessModule = typeof import("@tauri-apps/plugin-process");
let checkModule: UpdaterModule | null = null;
let processModule: ProcessModule | null = null;

async function loadModules() {
  try {
    checkModule = await import("@tauri-apps/plugin-updater");
    processModule = await import("@tauri-apps/plugin-process");
  } catch {
    // Plugins not available (web dev mode)
  }
}

export function useUpdateChecker() {
  const updateAvailable = useAppStore((s) => s.updateAvailable);
  const downloading = useAppStore((s) => s.downloading);
  const progress = useAppStore((s) => s.downloadProgress);
  const toastDismissed = useAppStore((s) => s.toastDismissed);

  const setUpdateAvailable = useAppStore((s) => s.setUpdateAvailable);
  const setDownloading = useAppStore((s) => s.setDownloading);
  const setDownloadProgress = useAppStore((s) => s.setDownloadProgress);
  const setToastDismissed = useAppStore((s) => s.setToastDismissed);

  const toastShownRef = useRef(false);

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
  }, [setUpdateAvailable]);

  // Check on app start + every 4 hours
  useEffect(() => {
    checkForUpdate();
    const interval = setInterval(checkForUpdate, 4 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  // Show toast on first detection
  useEffect(() => {
    if (updateAvailable && !toastDismissed && !toastShownRef.current) {
      toastShownRef.current = true;
      toast(t("updateAvailable"), {
        description: `v${updateAvailable.version} ${t("updateReady")}`,
        duration: 8000,
        action: {
          label: t("viewDetails"),
          onClick: () => {
            // Will be handled by the component that opens UpdateDialog
            window.dispatchEvent(new CustomEvent("kodiq:open-update-dialog"));
          },
        },
        onDismiss: () => setToastDismissed(true),
      });
    }
  }, [updateAvailable, toastDismissed, setToastDismissed]);

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
            setDownloadProgress(Math.round((downloaded / totalSize) * 100));
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
  }, [setDownloading, setDownloadProgress]);

  return { updateAvailable, downloading, progress, installUpdate, checkForUpdate };
}
