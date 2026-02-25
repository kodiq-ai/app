import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

// ── Language display names ──────────────────────────
const LANG_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  html: "HTML",
  css: "CSS",
  json: "JSON",
  markdown: "Markdown",
  python: "Python",
  rust: "Rust",
  go: "Go",
  java: "Java",
  cpp: "C++",
  php: "PHP",
  sql: "SQL",
  xml: "XML",
  yaml: "YAML",
  toml: "TOML",
  shell: "Shell",
  plaintext: "Plain Text",
};

export function EditorStatusBar() {
  const cursorInfo = useAppStore((s) => s.cursorInfo);
  const activeEditorTab = useAppStore((s) => s.activeEditorTab);
  const editorTabs = useAppStore((s) => s.editorTabs);

  if (!cursorInfo) return null;

  const activeTab = editorTabs.find((tab) => tab.path === activeEditorTab);
  const language = activeTab?.language ?? "plaintext";
  const langLabel = LANG_LABELS[language] ?? language;

  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-white/[0.06] bg-[var(--bg-surface)] px-3 text-[11px] text-[var(--text-secondary)]">
      <div className="flex items-center gap-2">
        <span>
          {t("statusBarLine")} {cursorInfo.line}, {t("statusBarCol")} {cursorInfo.col}
        </span>
        {cursorInfo.selected > 0 && (
          <span className="text-[var(--text-tertiary)]">
            ({cursorInfo.selected} {t("statusBarSelected")})
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
        <span>UTF-8</span>
        <span>·</span>
        <span>{t("statusBarSpaces")}: 2</span>
        <span>·</span>
        <span>{langLabel}</span>
      </div>
    </div>
  );
}
