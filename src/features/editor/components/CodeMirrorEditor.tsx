// ── CodeMirror 6 Editor ─────────────────────────────────────────────────────
// Core CM6 React wrapper. One EditorView per tab — stored in viewCache.
// Preserves undo history, cursor position, and scroll per tab.
// Editor settings (line numbers, word wrap, tab size) live in a settingsCompartment.

import { useEffect, useRef, useCallback } from "react";
import {
  EditorView,
  keymap,
  lineNumbers,
  drawSelection,
  highlightActiveLine,
} from "@codemirror/view";
import { EditorState, Compartment, type Extension } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, foldGutter, foldKeymap } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { search, highlightSelectionMatches } from "@codemirror/search";
import { useAppStore } from "@/lib/store";
import { kodiqTheme } from "../lib/kodiqTheme";
import { loadLanguage } from "../lib/languageLoader";
import { getViewEntry, setViewEntry, hasViewEntry } from "../lib/viewCache";
import type { EditorTab } from "../store/editorSlice";
import type { AppSettings } from "@shared/lib/types";

// -- Helpers -------
function buildEditorSettings(settings: AppSettings): Extension[] {
  const exts: Extension[] = [];
  if (settings.showLineNumbers) exts.push(lineNumbers());
  if (settings.wordWrap) exts.push(EditorView.lineWrapping);
  exts.push(EditorState.tabSize.of(settings.tabSize));
  return exts;
}

// -- Component -------
interface Props {
  tab: EditorTab;
}

export function CodeMirrorEditor({ tab }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const updateTabContent = useAppStore((s) => s.updateTabContent);
  const updateTabScroll = useAppStore((s) => s.updateTabScroll);
  const setCursorInfo = useAppStore((s) => s.setCursorInfo);
  const settings = useAppStore((s) => s.settings);

  // Stable refs for callbacks (avoid stale closures)
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const updateContentRef = useRef(updateTabContent);
  updateContentRef.current = updateTabContent;

  const updateScrollRef = useRef(updateTabScroll);
  updateScrollRef.current = updateTabScroll;

  const setCursorInfoRef = useRef(setCursorInfo);
  setCursorInfoRef.current = setCursorInfo;

  // -- Create or reuse EditorView -------
  const getOrCreateView = useCallback(() => {
    const existing = getViewEntry(tab.path);
    if (existing) return existing;

    const langCompartment = new Compartment();
    const settingsCompartment = new Compartment();
    const currentSettings = useAppStore.getState().settings;

    const startState = EditorState.create({
      doc: tab.content,
      extensions: [
        // Core
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        search({ top: false, createPanel: () => ({ dom: document.createElement("div") }) }),
        foldGutter(),

        // Settings compartment (line numbers, word wrap, tab size)
        settingsCompartment.of(buildEditorSettings(currentSettings)),

        // Language (empty placeholder — loaded async)
        langCompartment.of([]),

        // Keymaps
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...closeBracketsKeymap,
          ...foldKeymap,
          indentWithTab,
        ]),

        // Theme
        ...kodiqTheme,

        // Update listener → sync content to Zustand
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const content = update.state.doc.toString();
            updateContentRef.current(tabRef.current.path, content);
          }
          if (update.selectionSet || update.docChanged) {
            const { head } = update.state.selection.main;
            const line = update.state.doc.lineAt(head);
            const selRange = update.state.selection.main;
            const selected = Math.abs(selRange.to - selRange.from);
            setCursorInfoRef.current({
              line: line.number,
              col: head - line.from + 1,
              selected,
            });
          }
        }),
      ],
    });

    const view = new EditorView({ state: startState });

    const entry = { view, langCompartment, settingsCompartment };
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

  // -- Reconfigure settings when they change -------
  useEffect(() => {
    const entry = getViewEntry(tab.path);
    if (!entry) return;
    entry.view.dispatch({
      effects: entry.settingsCompartment.reconfigure(buildEditorSettings(settings)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we track individual settings fields, not the whole object
  }, [tab.path, settings.showLineNumbers, settings.wordWrap, settings.tabSize]);

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
