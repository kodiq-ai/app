import { GitBranch } from "lucide-react";
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EditorStatusBar() {
  const cursorInfo = useAppStore((s) => s.cursorInfo);
  const activeEditorTab = useAppStore((s) => s.activeEditorTab);
  const editorTabs = useAppStore((s) => s.editorTabs);
  const gitInfo = useAppStore((s) => s.gitInfo);

  const activeTab = editorTabs.find((tab) => tab.path === activeEditorTab);
  const hasEditor = !!cursorInfo;
  const language = activeTab?.language ?? "plaintext";
  const langLabel = LANG_LABELS[language] ?? language;
  const changedCount = gitInfo?.changedCount ?? 0;

  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-white/[0.06] bg-[var(--bg-surface)] px-3 text-[11px] text-[var(--text-secondary)]">
      {/* Left: git info (always) + cursor info (when editor open) */}
      <div className="flex items-center gap-3">
        {gitInfo?.isGit && gitInfo.branch && (
          <div className="flex items-center gap-1.5">
            <GitBranch size={12} className="text-[var(--text-tertiary)]" />
            <span>{gitInfo.branch}</span>
            {changedCount > 0 && (
              <span className="rounded-full bg-white/[0.08] px-1.5 text-[10px] text-[var(--text-tertiary)]">
                {changedCount}
              </span>
            )}
          </div>
        )}

        {hasEditor && (
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
        )}
      </div>

      {/* Right: encoding, indent, language, file size (when editor open) */}
      {hasEditor && (
        <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
          <span>UTF-8</span>
          <span>·</span>
          <span>{t("statusBarSpaces")}: 2</span>
          <span>·</span>
          <span>{langLabel}</span>
          {activeTab && (
            <>
              <span>·</span>
              <span>{formatBytes(activeTab.content.length)}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
