// ── Editor Panel ────────────────────────────────────────────────────────────
// Combines EditorTabBar + CodeMirrorEditor + UnsavedDialog.
// Returns null when no editor tabs are open.

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { fs } from "@shared/lib/tauri";
import { handleError } from "@shared/lib/errors";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { EditorTabBar } from "./EditorTabBar";
import { CodeMirrorEditor } from "./CodeMirrorEditor";
import { destroyEditorView } from "../lib/viewCache";
import { UnsavedDialog } from "./UnsavedDialog";

export function EditorPanel() {
  const editorTabs = useAppStore((s) => s.editorTabs);
  const activeEditorTab = useAppStore((s) => s.activeEditorTab);
  const closeEditorTab = useAppStore((s) => s.closeEditorTab);
  const forceCloseEditorTab = useAppStore((s) => s.forceCloseEditorTab);
  const markTabSaved = useAppStore((s) => s.markTabSaved);

  // Unsaved dialog state
  const [pendingClose, setPendingClose] = useState<string | null>(null);
  const pendingTab = editorTabs.find((t) => t.path === pendingClose);

  // -- Close tab handler (checks dirty state) -------
  const handleClose = useCallback(
    (path: string) => {
      const closed = closeEditorTab(path);
      if (closed) {
        // Clean tab — destroy view
        destroyEditorView(path);
      } else {
        // Dirty tab — show dialog
        setPendingClose(path);
      }
    },
    [closeEditorTab],
  );

  // -- Dialog actions -------
  const handleSaveAndClose = useCallback(async () => {
    if (!pendingClose || !pendingTab) return;

    try {
      await fs.writeFile(pendingTab.path, pendingTab.content);
      markTabSaved(pendingTab.path, pendingTab.content);
      toast.success(t("fileSaved"));
      forceCloseEditorTab(pendingTab.path);
      destroyEditorView(pendingTab.path);
    } catch (e) {
      handleError(e, t("failedToSave"));
    }

    setPendingClose(null);
  }, [pendingClose, pendingTab, markTabSaved, forceCloseEditorTab]);

  const handleDiscard = useCallback(() => {
    if (!pendingClose) return;
    forceCloseEditorTab(pendingClose);
    destroyEditorView(pendingClose);
    setPendingClose(null);
  }, [pendingClose, forceCloseEditorTab]);

  const handleCancelClose = useCallback(() => {
    setPendingClose(null);
  }, []);

  // -- No tabs? -------
  if (editorTabs.length === 0) return null;

  const activeTab = editorTabs.find((t) => t.path === activeEditorTab);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <EditorTabBar tabs={editorTabs} activeTab={activeEditorTab} onClose={handleClose} />

      {/* Editor Area */}
      <div className="relative flex-1 overflow-hidden">
        {activeTab ? (
          <CodeMirrorEditor key={activeTab.path} tab={activeTab} />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-[var(--text-tertiary)]">
            {t("noOpenFiles")}
          </div>
        )}
      </div>

      {/* Unsaved Changes Dialog */}
      <UnsavedDialog
        open={pendingClose !== null}
        fileName={pendingTab?.name ?? ""}
        onSaveAndClose={handleSaveAndClose}
        onDiscard={handleDiscard}
        onCancel={handleCancelClose}
      />
    </div>
  );
}
