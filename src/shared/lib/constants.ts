// ─── Constants ──────────────────────────────────────────────────────────────

export const CLI_COLORS: Record<string, string> = {
  google: "#4285F4",
  openai: "#10A37F",
  anthropic: "#D97757",
};

export const CLI_INSTALL_URLS: Record<string, string> = {
  gemini: "https://github.com/google-gemini/gemini-cli",
  codex: "https://github.com/openai/codex",
  claude: "https://docs.anthropic.com/en/docs/claude-code/overview",
};

// ── Academy ─────────────────────────────────────────────
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
// Supabase storage key used by web app (sb-{project-ref}-auth-token)
const supabaseRef = SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split(".")[0] : "unknown";
export const SUPABASE_STORAGE_KEY = `sb-${supabaseRef}-auth-token`;
export const ACADEMY_URL = "https://kodiq.ai/academy";
export const FEED_URL = "https://kodiq.ai/feed";

export const XTERM_THEME = {
  background: "#08080a",
  foreground: "#ece8e1",
  cursor: "#c4a882",
  cursorAccent: "#08080a",
  selectionBackground: "rgba(196, 168, 130, 0.25)",
  selectionForeground: "#ffffff",
  black: "#111114",
  red: "#c4705a",
  green: "#6a9a5a",
  yellow: "#d4944a",
  blue: "#8da1f2",
  magenta: "#c678dd",
  cyan: "#c4a882",
  white: "#ece8e1",
  brightBlack: "#5a5854",
  brightRed: "#d48a8a",
  brightGreen: "#8fc9a8",
  brightYellow: "#d9bf7e",
  brightBlue: "#a8b8f5",
  brightMagenta: "#d49ae5",
  brightCyan: "#dac4a0",
  brightWhite: "#f4f4f5",
};
