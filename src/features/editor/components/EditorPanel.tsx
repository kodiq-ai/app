// ── Editor Panel ────────────────────────────────────────────────────────────
// Combines EditorTabBar + CodeMirrorEditor + UnsavedDialog + EditorStatusBar.
// Integrates GoToLineDialog and FindReplacePanel with keyboard shortcuts.
// Returns null when no editor tabs are open.

import { useState, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { EditorSelection } from "@codemirror/state";
import {
  SearchQuery,
  setSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  getSearchQuery,
} from "@codemirror/search";
import { useAppStore } from "@/lib/store";
import { fs } from "@shared/lib/tauri";
import { handleError } from "@shared/lib/errors";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { EditorTabBar } from "./EditorTabBar";
import { EditorBreadcrumb } from "./EditorBreadcrumb";
import { CodeMirrorEditor } from "./CodeMirrorEditor";
import { GoToLineDialog } from "./GoToLineDialog";
import { FindReplacePanel, type SearchParams } from "./FindReplacePanel";
import { destroyEditorView, getViewEntry } from "../lib/viewCache";
import { UnsavedDialog } from "./UnsavedDialog";

export function EditorPanel() {
  const editorTabs = useAppStore((s) => s.editorTabs);
  const activeEditorTab = useAppStore((s) => s.activeEditorTab);
  const closeEditorTab = useAppStore((s) => s.closeEditorTab);
  const forceCloseEditorTab = useAppStore((s) => s.forceCloseEditorTab);
  const markTabSaved = useAppStore((s) => s.markTabSaved);

  // -- Unsaved dialog state -------
  const [pendingClose, setPendingClose] = useState<string | null>(null);
  const pendingTab = editorTabs.find((tab) => tab.path === pendingClose);

  // -- Dialog state -------
  const [goToLineOpen, setGoToLineOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findShowReplace, setFindShowReplace] = useState(false);
  const [findInitialQuery, setFindInitialQuery] = useState("");
  const [findMatchCount, setFindMatchCount] = useState(0);
  const [findCurrentMatch, setFindCurrentMatch] = useState(0);

  // -- Active view helper -------
  const getActiveView = useCallback(() => {
    if (!activeEditorTab) return null;
    return getViewEntry(activeEditorTab)?.view ?? null;
  }, [activeEditorTab]);

  // -- Close tab handler (checks dirty state) -------
  const handleClose = useCallback(
    (path: string) => {
      const closed = closeEditorTab(path);
      if (closed) {
        destroyEditorView(path);
      } else {
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

  // -- Go to Line handler -------
  const handleGoToLine = useCallback(
    (line: number) => {
      const view = getActiveView();
      if (!view) return;
      const docLine = view.state.doc.line(Math.min(line, view.state.doc.lines));
      view.dispatch({
        selection: EditorSelection.cursor(docLine.from),
        scrollIntoView: true,
      });
      view.focus();
    },
    [getActiveView],
  );

  // -- Find & Replace handlers -------

  // Shared helper: compute 1-based index of the match at/after the cursor head.
  // TODO: debounce for large files — full-document iteration on every keystroke
  // may lag for 10k+ line files with broad queries.
  const updateCurrentMatchIndex = useCallback(() => {
    const view = getActiveView();
    if (!view) return;
    const query = getSearchQuery(view.state);
    if (!query.valid) return;
    const cursor = query.getCursor(view.state.doc);
    const head = view.state.selection.main.head;
    let idx = 0;
    let result = cursor.next();
    while (!result.done) {
      idx++;
      if (result.value.from >= head) break;
      result = cursor.next();
    }
    setFindCurrentMatch(idx);
  }, [getActiveView]);

  const handleFindSearch = useCallback(
    (params: SearchParams) => {
      const view = getActiveView();
      if (!view) return;
      if (!params.query) {
        setFindMatchCount(0);
        setFindCurrentMatch(0);
        view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: "" })) });
        return;
      }
      const sq = new SearchQuery({
        search: params.query,
        caseSensitive: params.caseSensitive,
        regexp: params.regexp,
        replace: params.replace,
      });
      view.dispatch({ effects: setSearchQuery.of(sq) });
      // Count matches — TODO: debounce for large files
      const cursor = sq.getCursor(view.state.doc);
      let count = 0;
      while (!cursor.next().done) count++;
      setFindMatchCount(count);
      setFindCurrentMatch(count > 0 ? 1 : 0);
    },
    [getActiveView],
  );

  const handleFindNext = useCallback(() => {
    const view = getActiveView();
    if (!view) return;
    findNext(view);
    updateCurrentMatchIndex();
  }, [getActiveView, updateCurrentMatchIndex]);

  const handleFindPrev = useCallback(() => {
    const view = getActiveView();
    if (!view) return;
    findPrevious(view);
    updateCurrentMatchIndex();
  }, [getActiveView, updateCurrentMatchIndex]);

  const handleReplace = useCallback(() => {
    const view = getActiveView();
    if (view) replaceNext(view);
  }, [getActiveView]);

  const handleReplaceAll = useCallback(() => {
    const view = getActiveView();
    if (view) replaceAll(view);
  }, [getActiveView]);

  const handleFindClose = useCallback(() => {
    setFindOpen(false);
    const view = getActiveView();
    if (view) {
      view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: "" })) });
      view.focus();
    }
  }, [getActiveView]);

  const handleGoToLineClose = useCallback(() => {
    setGoToLineOpen(false);
    getActiveView()?.focus();
  }, [getActiveView]);

  // -- Shortcuts -------
  useHotkeys(
    "mod+g",
    (e) => {
      e.preventDefault();
      setGoToLineOpen(true);
    },
    { enableOnFormTags: true },
  );

  useHotkeys(
    "mod+f",
    (e) => {
      e.preventDefault();
      const view = getActiveView();
      const sel = view?.state.selection.main;
      const selectedText =
        view && sel && sel.from !== sel.to ? view.state.sliceDoc(sel.from, sel.to) : "";
      setFindInitialQuery(selectedText);
      setFindShowReplace(false);
      setFindOpen(true);
    },
    { enableOnFormTags: true },
  );

  useHotkeys(
    "mod+h",
    (e) => {
      e.preventDefault();
      const view = getActiveView();
      const sel = view?.state.selection.main;
      const selectedText =
        view && sel && sel.from !== sel.to ? view.state.sliceDoc(sel.from, sel.to) : "";
      setFindInitialQuery(selectedText);
      setFindShowReplace(true);
      setFindOpen(true);
    },
    { enableOnFormTags: true },
  );

  // -- No tabs? -------
  if (editorTabs.length === 0) return null;

  const activeTab = editorTabs.find((tab) => tab.path === activeEditorTab);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <EditorTabBar tabs={editorTabs} activeTab={activeEditorTab} onClose={handleClose} />
      <EditorBreadcrumb />

      {/* Editor Area */}
      <div className="relative flex-1 overflow-hidden">
        {activeTab ? (
          <CodeMirrorEditor key={activeTab.path} tab={activeTab} />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-[var(--text-tertiary)]">
            {t("noOpenFiles")}
          </div>
        )}

        {/* Find & Replace overlay */}
        <FindReplacePanel
          open={findOpen}
          showReplace={findShowReplace}
          initialQuery={findInitialQuery}
          matchCount={findMatchCount}
          currentMatch={findCurrentMatch}
          onSearch={handleFindSearch}
          onNext={handleFindNext}
          onPrev={handleFindPrev}
          onReplace={handleReplace}
          onReplaceAll={handleReplaceAll}
          onClose={handleFindClose}
        />

        {/* Go to Line overlay */}
        <GoToLineDialog
          open={goToLineOpen}
          totalLines={getActiveView()?.state.doc.lines ?? 1}
          onJump={handleGoToLine}
          onClose={handleGoToLineClose}
        />
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
