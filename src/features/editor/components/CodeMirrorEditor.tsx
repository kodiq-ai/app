// ── CodeMirror 6 Editor ─────────────────────────────────────────────────────
// Core CM6 React wrapper. One EditorView per tab — stored in viewCache.
// Preserves undo history, cursor position, and scroll per tab.

import { useEffect, useRef, useCallback } from "react";
import {
  EditorView,
  keymap,
  lineNumbers,
  drawSelection,
  highlightActiveLine,
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, foldGutter, foldKeymap } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { useAppStore } from "@/lib/store";
import { fs } from "@shared/lib/tauri";
import { handleError } from "@shared/lib/errors";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { kodiqTheme } from "../lib/kodiqTheme";
import { loadLanguage } from "../lib/languageLoader";
import { getViewEntry, setViewEntry, hasViewEntry } from "../lib/viewCache";
import type { EditorTab } from "../store/editorSlice";

// -- Save handler -------
async function saveActiveTab() {
  const { activeEditorTab, editorTabs, markTabSaved } = useAppStore.getState();
  if (!activeEditorTab) return;

  const tab = editorTabs.find((t) => t.path === activeEditorTab);
  if (!tab || tab.content === tab.savedContent) return; // clean — skip

  try {
    await fs.writeFile(tab.path, tab.content);
    markTabSaved(tab.path, tab.content);
    toast.success(t("fileSaved"));
  } catch (e) {
    handleError(e, t("failedToSave"));
  }
}

// -- Component -------
interface Props {
  tab: EditorTab;
}

export function CodeMirrorEditor({ tab }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const updateTabContent = useAppStore((s) => s.updateTabContent);
  const updateTabScroll = useAppStore((s) => s.updateTabScroll);

  // Stable refs for callbacks (avoid stale closures)
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const updateContentRef = useRef(updateTabContent);
  updateContentRef.current = updateTabContent;

  const updateScrollRef = useRef(updateTabScroll);
  updateScrollRef.current = updateTabScroll;

  // -- Create or reuse EditorView -------
  const getOrCreateView = useCallback(() => {
    const existing = getViewEntry(tab.path);
    if (existing) return existing;

    const langCompartment = new Compartment();

    const startState = EditorState.create({
      doc: tab.content,
      extensions: [
        // Core
        lineNumbers(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        foldGutter(),

        // Language (empty placeholder — loaded async)
        langCompartment.of([]),

        // Keymaps
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...closeBracketsKeymap,
          ...searchKeymap,
          ...foldKeymap,
          indentWithTab,
          {
            key: "Mod-s",
            run: () => {
              saveActiveTab();
              return true;
            },
          },
        ]),

        // Theme
        ...kodiqTheme,

        // Update listener → sync content to Zustand
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const content = update.state.doc.toString();
            updateContentRef.current(tabRef.current.path, content);
          }
        }),

        // Tab size
        EditorState.tabSize.of(2),
      ],
    });

    const view = new EditorView({ state: startState });

    const entry = { view, langCompartment };
    setViewEntry(tab.path, entry);

    // Load language async
    loadLanguage(tab.language).then((lang) => {
      if (lang && hasViewEntry(tab.path)) {
        view.dispatch({
          effects: langCompartment.reconfigure(lang),
        });
      }
    });

    return entry;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tab.content excluded intentionally: including it causes re-render on every keystroke
  }, [tab.path, tab.language]);

  // -- Mount / Unmount -------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { view } = getOrCreateView();

    // Mount into DOM
    container.appendChild(view.dom);

    // Restore scroll position if saved
    if (tab.scrollPos) {
      view.scrollDOM.scrollTop = tab.scrollPos.top;
      view.scrollDOM.scrollLeft = tab.scrollPos.left;
    }

    // Focus the editor
    view.focus();

    return () => {
      // Save scroll position before unmount
      updateScrollRef.current(tab.path, {
        top: view.scrollDOM.scrollTop,
        left: view.scrollDOM.scrollLeft,
      });

      // Detach from DOM (but keep view alive in cache)
      if (container.contains(view.dom)) {
        container.removeChild(view.dom);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tab.scrollPos excluded: scroll restore is one-time on mount, not reactive
  }, [tab.path, getOrCreateView]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden [&_.cm-editor]:h-full" />;
}
