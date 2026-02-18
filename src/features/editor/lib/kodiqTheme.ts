// ── CodeMirror 6 Theme — Kodiq Dark ─────────────────────────────────────────
// Matches design tokens: bg-base, text-primary, accent cyan, Monaspace Neon.

import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// -- Design Tokens -------
const tokens = {
  bg: "#09090b",
  bgSurface: "#111113",
  bgHighlight: "#18181b",
  accent: "#06b6d4",
  text: "#f4f4f5",
  textSecondary: "#a1a1aa",
  textTertiary: "#52525b",
  border: "#3f3f46",
  selection: "rgba(6, 182, 212, 0.15)",
  lineHighlight: "rgba(255, 255, 255, 0.03)",
  gutter: "#27272a",
  gutterActive: "#a1a1aa",
};

// -- Editor View Theme (UI) -------
const editorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: tokens.bg,
      color: tokens.text,
      fontFamily: "var(--font-code, 'Monaspace Neon', monospace)",
      fontSize: "12px",
      height: "100%",
    },
    ".cm-content": {
      padding: "8px 0",
      caretColor: tokens.accent,
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: tokens.accent,
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: tokens.selection,
    },
    ".cm-activeLine": {
      backgroundColor: tokens.lineHighlight,
    },
    ".cm-gutters": {
      backgroundColor: tokens.bg,
      color: tokens.gutter,
      borderRight: "1px solid rgba(255, 255, 255, 0.03)",
      paddingLeft: "8px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: tokens.gutterActive,
    },
    ".cm-foldPlaceholder": {
      backgroundColor: tokens.bgHighlight,
      color: tokens.textSecondary,
      border: `1px solid ${tokens.border}`,
    },
    ".cm-tooltip": {
      backgroundColor: tokens.bgSurface,
      border: `1px solid ${tokens.border}`,
      color: tokens.text,
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: tokens.bgHighlight,
        color: tokens.text,
      },
    },
    ".cm-searchMatch": {
      backgroundColor: "rgba(6, 182, 212, 0.2)",
      outline: `1px solid rgba(6, 182, 212, 0.4)`,
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "rgba(6, 182, 212, 0.35)",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(6, 182, 212, 0.25)",
      outline: "1px solid rgba(6, 182, 212, 0.5)",
    },
    ".cm-panels": {
      backgroundColor: tokens.bgSurface,
      color: tokens.text,
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: `1px solid ${tokens.border}`,
    },
    ".cm-panel.cm-search": {
      padding: "4px 8px",
    },
    ".cm-panel.cm-search input": {
      backgroundColor: tokens.bg,
      color: tokens.text,
      border: `1px solid ${tokens.border}`,
      borderRadius: "4px",
    },
    ".cm-panel.cm-search button": {
      color: tokens.textSecondary,
    },
    ".cm-scroller": {
      overflow: "auto",
    },
  },
  { dark: true },
);

// -- Syntax Highlight Style -------
const highlightStyle = HighlightStyle.define([
  // Comments
  { tag: t.comment, color: "#52525b", fontStyle: "italic" },
  { tag: t.lineComment, color: "#52525b", fontStyle: "italic" },
  { tag: t.blockComment, color: "#52525b", fontStyle: "italic" },

  // Keywords & control
  { tag: t.keyword, color: "#c084fc" }, // purple-400
  { tag: t.controlKeyword, color: "#c084fc" },
  { tag: t.operatorKeyword, color: "#c084fc" },

  // Types & classes
  { tag: t.typeName, color: "#22d3ee" }, // cyan-400
  { tag: t.className, color: "#22d3ee" },
  { tag: t.namespace, color: "#22d3ee" },

  // Functions
  { tag: t.function(t.variableName), color: "#60a5fa" }, // blue-400
  { tag: t.function(t.propertyName), color: "#60a5fa" },

  // Variables & properties
  { tag: t.variableName, color: "#f4f4f5" },
  { tag: t.propertyName, color: "#67e8f9" }, // cyan-300
  { tag: t.definition(t.variableName), color: "#f4f4f5" },

  // Strings
  { tag: t.string, color: "#86efac" }, // green-300
  { tag: t.special(t.string), color: "#86efac" },

  // Numbers & booleans
  { tag: t.number, color: "#fdba74" }, // orange-300
  { tag: t.bool, color: "#fdba74" },
  { tag: t.null, color: "#fdba74" },

  // Regex
  { tag: t.regexp, color: "#f87171" }, // red-400

  // Operators & punctuation
  { tag: t.operator, color: "#a1a1aa" },
  { tag: t.punctuation, color: "#71717a" },
  { tag: t.bracket, color: "#a1a1aa" },

  // Tags (HTML/XML)
  { tag: t.tagName, color: "#f87171" }, // red-400
  { tag: t.attributeName, color: "#fdba74" },
  { tag: t.attributeValue, color: "#86efac" },

  // Meta
  { tag: t.meta, color: "#a1a1aa" },
  { tag: t.processingInstruction, color: "#a1a1aa" },

  // Heading (Markdown)
  { tag: t.heading, color: "#f4f4f5", fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.link, color: "#06b6d4", textDecoration: "underline" },

  // Invalid
  { tag: t.invalid, color: "#f87171", textDecoration: "underline wavy" },
]);

// -- Combined Extension -------
export const kodiqTheme = [editorTheme, syntaxHighlighting(highlightStyle)];
