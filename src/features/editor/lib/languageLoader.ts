// ── Lazy Language Loader ─────────────────────────────────────────────────────
// Maps file extensions to @codemirror/lang-* dynamic imports.
// Cached in memory — each language module is loaded once.

import type { LanguageSupport } from "@codemirror/language";

type LanguageFactory = () => Promise<LanguageSupport>;

// -- Extension → Loader Map -------
const loaderMap: Record<string, LanguageFactory> = {
  // JavaScript / TypeScript
  js: () => import("@codemirror/lang-javascript").then((m) => m.javascript()),
  jsx: () => import("@codemirror/lang-javascript").then((m) => m.javascript({ jsx: true })),
  ts: () => import("@codemirror/lang-javascript").then((m) => m.javascript({ typescript: true })),
  tsx: () =>
    import("@codemirror/lang-javascript").then((m) =>
      m.javascript({ jsx: true, typescript: true }),
    ),
  mjs: () => import("@codemirror/lang-javascript").then((m) => m.javascript()),
  cjs: () => import("@codemirror/lang-javascript").then((m) => m.javascript()),

  // Web
  html: () => import("@codemirror/lang-html").then((m) => m.html()),
  htm: () => import("@codemirror/lang-html").then((m) => m.html()),
  css: () => import("@codemirror/lang-css").then((m) => m.css()),
  scss: () => import("@codemirror/lang-css").then((m) => m.css()),

  // Data
  json: () => import("@codemirror/lang-json").then((m) => m.json()),
  jsonc: () => import("@codemirror/lang-json").then((m) => m.json()),

  // Markdown
  md: () => import("@codemirror/lang-markdown").then((m) => m.markdown()),
  mdx: () => import("@codemirror/lang-markdown").then((m) => m.markdown()),

  // Systems
  rs: () => import("@codemirror/lang-rust").then((m) => m.rust()),
  go: () => import("@codemirror/lang-go").then((m) => m.go()),
  cpp: () => import("@codemirror/lang-cpp").then((m) => m.cpp()),
  c: () => import("@codemirror/lang-cpp").then((m) => m.cpp()),
  h: () => import("@codemirror/lang-cpp").then((m) => m.cpp()),
  hpp: () => import("@codemirror/lang-cpp").then((m) => m.cpp()),
  java: () => import("@codemirror/lang-java").then((m) => m.java()),

  // Scripting
  py: () => import("@codemirror/lang-python").then((m) => m.python()),
  php: () => import("@codemirror/lang-php").then((m) => m.php()),
  sql: () => import("@codemirror/lang-sql").then((m) => m.sql()),

  // XML
  xml: () => import("@codemirror/lang-xml").then((m) => m.xml()),
  svg: () => import("@codemirror/lang-xml").then((m) => m.xml()),

  // Config files — treat as relevant language
  toml: () => import("@codemirror/lang-json").then((m) => m.json()), // close enough
  yaml: () => import("@codemirror/lang-json").then((m) => m.json()),
  yml: () => import("@codemirror/lang-json").then((m) => m.json()),
};

// -- Cache -------
const cache = new Map<string, LanguageSupport>();

// -- Public API -------
export async function loadLanguage(extension: string): Promise<LanguageSupport | null> {
  const ext = extension.toLowerCase();

  // Check cache first
  const cached = cache.get(ext);
  if (cached) return cached;

  // Find loader
  const loader = loaderMap[ext];
  if (!loader) return null;

  try {
    const lang = await loader();
    cache.set(ext, lang);
    return lang;
  } catch (e) {
    console.warn(`[Kodiq] Failed to load language for .${ext}:`, e);
    return null;
  }
}

/** Check if an extension has a language loader registered. */
export function hasLanguageSupport(extension: string): boolean {
  return extension.toLowerCase() in loaderMap;
}
