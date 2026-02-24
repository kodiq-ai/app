// ── i18n — JSON locale system ─────────────────────────────────────────────────
// English is the default (always bundled). Other locales are lazy-loaded.

import en from "./en.json";

export type Locale = "en" | "ru";

// -- Lazy-loaded locale map (explicit imports for Vite static analysis) -------
const loaders: Record<string, () => Promise<{ default: Record<string, string> }>> = {
  ru: () => import("./ru.json"),
};

let current: Record<string, string> = en;
let currentLocale: Locale = "en";

/**
 * Set the active locale. English is immediate, others are lazy-loaded.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (locale === "en") {
    current = en;
  } else {
    const loader = loaders[locale];
    if (!loader) throw new Error(`Unknown locale: ${locale}`);
    const mod = await loader();
    current = mod.default;
  }
  currentLocale = locale;
}

/**
 * Translate a key. Falls back to the key itself if not found.
 */
export function t(key: string): string {
  return current[key] ?? key;
}

/**
 * Get the current locale.
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Detect locale from browser language.
 */
export function detectLocale(): Locale {
  const nav = navigator.language.slice(0, 2);
  return nav === "ru" ? "ru" : "en";
}
