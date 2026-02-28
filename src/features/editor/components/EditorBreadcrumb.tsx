// ── Editor Breadcrumb ────────────────────────────────────────────────────────
// Shows the relative file path as clickable segments above the editor.

import { ChevronRight } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function EditorBreadcrumb() {
  const activeEditorTab = useAppStore((s) => s.activeEditorTab);
  const editorTabs = useAppStore((s) => s.editorTabs);
  const projectPath = useAppStore((s) => s.projectPath);

  const activeTab = editorTabs.find((tab) => tab.path === activeEditorTab);
  if (!activeTab) return null;

  const relativePath = projectPath
    ? activeTab.path.replace(projectPath, "").replace(/^\//, "")
    : activeTab.name;

  const segments = relativePath.split("/").filter(Boolean);

  return (
    <div className="flex h-6 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-white/[0.04] bg-[var(--bg-surface)] px-3">
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={i} className="flex items-center gap-0.5">
            {i > 0 && (
              <ChevronRight className="size-3 shrink-0 text-[var(--text-tertiary)] opacity-40" />
            )}
            <span
              className={`text-[11px] whitespace-nowrap ${
                isLast ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
              }`}
            >
              {segment}
            </span>
          </span>
        );
      })}
    </div>
  );
}
