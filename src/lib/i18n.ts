// ── Compatibility shim ───────────────────────────────────────────────────────
// Re-exports from the new i18n location. Existing imports from @/lib/i18n
// continue to work.

export { t, setLocale, getLocale, detectLocale } from "@shared/i18n";
export type { Locale } from "@shared/i18n";
