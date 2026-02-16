import { useEffect, useState } from "react";
import type { HighlighterCore } from "shiki";

// ── Extension → Shiki language mapping ───────────────────────────────────────

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "jsonc",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  md: "markdown",
  mdx: "mdx",
  rs: "rust",
  toml: "toml",
  yaml: "yaml",
  yml: "yaml",
  py: "python",
  rb: "ruby",
  go: "go",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  vue: "vue",
  svelte: "svelte",
  xml: "xml",
  svg: "xml",
  lua: "lua",
  php: "php",
  dockerfile: "dockerfile",
  makefile: "makefile",
  zig: "zig",
  elixir: "elixir",
  ex: "elixir",
  exs: "elixir",
  dart: "dart",
  prisma: "prisma",
  ini: "ini",
  conf: "ini",
  env: "shellscript",
  lock: "json",
};

export function extToLang(ext: string): string | null {
  return EXT_TO_LANG[ext] || null;
}

// ── Singleton highlighter ────────────────────────────────────────────────────

let highlighterPromise: Promise<HighlighterCore> | null = null;
let highlighterInstance: HighlighterCore | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  if (highlighterInstance) return Promise.resolve(highlighterInstance);
  if (highlighterPromise) return highlighterPromise;

  highlighterPromise = (async () => {
    const { createHighlighter } = await import("shiki");
    const instance = await createHighlighter({
      themes: ["vitesse-dark"],
      langs: [], // load on-demand
    });
    highlighterInstance = instance;
    return instance;
  })();

  return highlighterPromise;
}

// ── Parse shiki HTML into per-line HTML strings ──────────────────────────────

function parseShikiLines(html: string): string[] {
  // Shiki outputs: <pre ...><code><span class="line">...</span>\n<span class="line">...</span></code></pre>
  // Each <span class="line"> can contain nested <span style="color:..."> elements.
  // We split by the line marker and extract inner content.

  const lines: string[] = [];
  const marker = '<span class="line">';
  let idx = html.indexOf(marker);

  while (idx !== -1) {
    const start = idx + marker.length;
    // Find the closing </span> that matches this line span.
    // We need to account for nested spans.
    let depth = 1;
    let pos = start;
    while (pos < html.length && depth > 0) {
      const nextOpen = html.indexOf("<span", pos);
      const nextClose = html.indexOf("</span>", pos);

      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 5;
      } else {
        depth--;
        if (depth === 0) {
          lines.push(html.slice(start, nextClose));
        }
        pos = nextClose + 7;
      }
    }

    idx = html.indexOf(marker, pos);
  }

  return lines;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface HighlightResult {
  /** Array of highlighted HTML strings per line */
  lines: string[];
  /** Whether highlight is ready (false = loading or unsupported) */
  ready: boolean;
}

export function useHighlighter(code: string, ext: string): HighlightResult {
  const [result, setResult] = useState<HighlightResult>({ lines: [], ready: false });

  useEffect(() => {
    if (!code) {
      setResult({ lines: [], ready: false });
      return;
    }

    const lang = extToLang(ext);
    if (!lang) {
      // No highlighting for unknown extensions — fall back to plain
      setResult({ lines: [], ready: false });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const hl = await getHighlighter();

        // Load language on-demand if not loaded yet
        const loadedLangs = hl.getLoadedLanguages();
        if (!loadedLangs.includes(lang as never)) {
          await hl.loadLanguage(lang as never);
        }

        if (cancelled) return;

        const html = hl.codeToHtml(code, {
          lang,
          theme: "vitesse-dark",
        });

        if (cancelled) return;

        const htmlLines = parseShikiLines(html);
        if (htmlLines.length > 0) {
          setResult({ lines: htmlLines, ready: true });
        } else {
          setResult({ lines: [], ready: false });
        }
      } catch {
        if (!cancelled) {
          setResult({ lines: [], ready: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, ext]);

  return result;
}
