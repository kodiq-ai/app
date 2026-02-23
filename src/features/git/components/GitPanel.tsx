// ── Git Panel ────────────────────────────────────────────────────────────────
// Source Control panel: stage/unstage files + commit.
// Lives in the 4th tab of the right Activity Bar.

import { useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { git } from "@shared/lib/tauri";
import { useAppStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { FileList } from "./FileList";

export function GitPanel() {
  const projectPath = useAppStore((s) => s.projectPath);
  const sidebarTab = useAppStore((s) => s.sidebarTab);
  const gitInfo = useAppStore((s) => s.gitInfo);
  const setGitInfo = useAppStore((s) => s.setGitInfo);
  const commitMessage = useAppStore((s) => s.commitMessage);
  const setCommitMessage = useAppStore((s) => s.setCommitMessage);
  const isCommitting = useAppStore((s) => s.isCommitting);
  const setIsCommitting = useAppStore((s) => s.setIsCommitting);

  // ── Load git info & listen for changes ──────────────────
  useEffect(() => {
    if (sidebarTab !== "git" || !projectPath) return;

    const refresh = () => {
      git
        .getInfo(projectPath)
        .then(setGitInfo)
        .catch((e) => console.error("[GitPanel]", e));
    };
    refresh();

    const unlisten = listen<string>("git-changed", refresh);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [sidebarTab, projectPath, setGitInfo]);

  const stagedFiles = gitInfo?.stagedFiles ?? [];
  const unstagedFiles = gitInfo?.unstagedFiles ?? [];

  // ── Actions ────────────────────────────────────────────
  const stageFile = useCallback(
    async (file: string) => {
      if (!projectPath) return;
      try {
        await git.stage(projectPath, [file]);
      } catch (e) {
        toast.error(t("gitStageError"), { description: String(e) });
      }
    },
    [projectPath],
  );

  const unstageFile = useCallback(
    async (file: string) => {
      if (!projectPath) return;
      try {
        await git.unstage(projectPath, [file]);
      } catch (e) {
        toast.error(t("gitUnstageError"), { description: String(e) });
      }
    },
    [projectPath],
  );

  const stageAll = useCallback(async () => {
    if (!projectPath) return;
    try {
      await git.stageAll(projectPath);
    } catch (e) {
      toast.error(t("gitStageError"), { description: String(e) });
    }
  }, [projectPath]);

  const unstageAll = useCallback(async () => {
    if (!projectPath) return;
    try {
      await git.unstageAll(projectPath);
    } catch (e) {
      toast.error(t("gitUnstageError"), { description: String(e) });
    }
  }, [projectPath]);

  const handleCommit = useCallback(async () => {
    if (!projectPath || !commitMessage.trim() || stagedFiles.length === 0) return;
    setIsCommitting(true);
    try {
      const result = await git.commit(projectPath, commitMessage.trim());
      toast.success(t("gitCommitted"), { description: result.hash });
      setCommitMessage("");
    } catch (e) {
      toast.error(t("gitCommitError"), { description: String(e) });
    } finally {
      setIsCommitting(false);
    }
  }, [projectPath, commitMessage, stagedFiles.length, setIsCommitting, setCommitMessage]);

  // ── No git info ────────────────────────────────────────
  if (!gitInfo?.isGit) {
    return (
      <div className="flex flex-1 items-center justify-center px-3">
        <span className="text-[11px] text-[#6E6E76]">{t("gitNotRepo")}</span>
      </div>
    );
  }

  const totalChanges = (gitInfo.stagedCount ?? 0) + (gitInfo.unstagedCount ?? 0);

  // ── No changes ─────────────────────────────────────────
  if (totalChanges === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-3">
        <span className="text-[11px] text-[#6E6E76]">{t("gitNoChanges")}</span>
      </div>
    );
  }

  const canCommit = commitMessage.trim().length > 0 && stagedFiles.length > 0 && !isCommitting;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Commit input */}
      <div className="flex flex-col gap-1.5 border-b border-white/[0.04] px-2 py-2">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canCommit) {
              e.preventDefault();
              handleCommit();
            }
          }}
          placeholder={t("gitCommitPlaceholder")}
          rows={2}
          className="w-full resize-none rounded border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 font-mono text-[11px] text-[#E6E6E9] placeholder:text-[#6E6E76] focus:border-[#4DA3C7]/40 focus:outline-none"
        />
        <Button
          size="sm"
          disabled={!canCommit}
          onClick={handleCommit}
          className="h-6 w-full bg-[#4DA3C7]/20 text-[11px] font-medium text-[#4DA3C7] hover:bg-[#4DA3C7]/30 disabled:opacity-30"
        >
          {isCommitting ? t("gitCommitting") : t("gitCommitAction")}
        </Button>
      </div>

      {/* File lists */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          <FileList
            title={t("gitStagedChanges")}
            files={stagedFiles}
            action="unstage"
            allActionLabel={t("gitUnstageAll")}
            onFileAction={unstageFile}
            onAllAction={unstageAll}
          />
          <FileList
            title={t("gitChanges")}
            files={unstagedFiles}
            action="stage"
            allActionLabel={t("gitStageAll")}
            onFileAction={stageFile}
            onAllAction={stageAll}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
