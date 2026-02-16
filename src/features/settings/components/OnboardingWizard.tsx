import { useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import {
  Check,
  FolderOpen,
  Folder,
  ChevronRight,
  Terminal,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { CLI_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { KodiqIcon } from "@/components/icons";
import type { CliTool, RecentProject } from "@shared/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  cliTools: CliTool[];
  defaultShell: string;
  recentProjects: RecentProject[];
  onComplete: (selectedPath?: string) => void;
  onOpenFolder: () => Promise<string | null>;
}

// ── Install URLs ──────────────────────────────────────────────────────────────

const INSTALL_URLS: Record<string, string> = {
  claude: "https://docs.anthropic.com/en/docs/claude-code/overview",
  gemini: "https://github.com/google-gemini/gemini-cli",
  codex: "https://github.com/openai/codex",
  aider: "https://aider.chat",
  ollama: "https://ollama.ai",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function OnboardingWizard({
  cliTools,
  defaultShell,
  recentProjects,
  onComplete,
  onOpenFolder,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const goToStep = (nextStep: number) => {
    setDirection(nextStep > step ? "right" : "left");
    setStep(nextStep);
  };

  const handleOpenFolder = async () => {
    const path = await onOpenFolder();
    if (path) {
      setSelectedPath(path);
    }
  };

  const handleSelectRecent = (path: string) => {
    setSelectedPath(path);
  };

  // ── Step 1: Welcome ───────────────────────────────────────────────────────

  const renderWelcome = () => (
    <div className="flex flex-col items-center gap-10">
      <div className="anim-1 animate-float">
        <KodiqIcon size={64} />
      </div>

      <div className="flex flex-col items-center gap-2 anim-2">
        <h1 className="text-[18px] font-semibold text-[#e4e4e7] tracking-tight">
          {t("onboardingWelcome")}
        </h1>
        <p className="text-[13px] text-[#71717a] text-center">
          {t("onboardingWelcomeDesc")}
        </p>
      </div>

      <div className="w-full anim-3">
        <Button
          onClick={() => goToStep(1)}
          className="w-full h-10 rounded-xl bg-[#14b8a6] hover:bg-[#14b8a6]/90 text-white text-[13px] font-medium gap-2 transition-all duration-200 active:scale-[0.98]"
        >
          {t("onboardingNext")}
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );

  // ── Step 2: CLI Tools ─────────────────────────────────────────────────────

  const renderCliTools = () => {
    const installedCli = cliTools.filter((tool) => tool.installed);
    const notInstalledCli = cliTools.filter((tool) => !tool.installed);

    return (
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 anim-1">
          <h1 className="text-[18px] font-semibold text-[#e4e4e7] tracking-tight">
            {t("onboardingCliTitle")}
          </h1>
          <p className="text-[13px] text-[#71717a] text-center">
            {t("onboardingCliDesc")}
          </p>
        </div>

        {/* CLI tool list */}
        <div className="w-full flex flex-col gap-px anim-2">
          {installedCli.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{ background: CLI_COLORS[tool.provider] }}
              >
                <Check className="size-2.5 text-white" strokeWidth={3} />
              </div>
              <span className="text-[12px] text-[#e4e4e7] flex-1">
                {tool.name}
              </span>
              <span className="text-[10px] text-[#52525c] font-mono">
                {tool.version}
              </span>
            </div>
          ))}

          {notInstalledCli.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
            >
              <div
                className="w-4 h-4 rounded-full shrink-0 opacity-25"
                style={{ background: CLI_COLORS[tool.provider] }}
              />
              <span className="text-[12px] text-[#52525c] flex-1">
                {tool.name}
              </span>
              {INSTALL_URLS[tool.bin] && (
                <Button
                  variant="ghost"
                  onClick={() => open(INSTALL_URLS[tool.bin])}
                  className="h-6 px-2.5 text-[10px] text-[#14b8a6] hover:text-[#14b8a6] hover:bg-[#14b8a6]/10 rounded-md font-medium"
                >
                  {t("onboardingCliInstall")}
                </Button>
              )}
            </div>
          ))}

          {cliTools.length === 0 && (
            <div className="flex flex-col items-center gap-1 py-4 text-center">
              <span className="text-[12px] text-[#52525c]">
                {t("onboardingCliNoneFound")}
              </span>
              <span className="text-[11px] text-[#3f3f46]">
                {t("onboardingCliNoneFoundDesc")}
              </span>
            </div>
          )}
        </div>

        {/* Shell info */}
        <div className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.01] anim-3">
          <div className="w-7 h-7 rounded-md bg-white/[0.03] flex items-center justify-center text-[#52525c]">
            <Terminal className="size-3.5" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-[#52525c] uppercase tracking-[0.06em]">
              {t("onboardingShellDetected")}
            </div>
            <div className="text-[12px] text-[#a1a1aa] font-mono">
              {defaultShell}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="w-full flex gap-2 anim-4">
          <Button
            variant="ghost"
            onClick={() => goToStep(0)}
            className="h-10 px-4 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] text-[#71717a] hover:text-[#a1a1aa] text-[13px] font-medium gap-2 transition-all duration-200"
          >
            <ArrowLeft className="size-3.5" />
            {t("onboardingBack")}
          </Button>
          <Button
            onClick={() => goToStep(2)}
            className="flex-1 h-10 rounded-xl bg-[#14b8a6] hover:bg-[#14b8a6]/90 text-white text-[13px] font-medium gap-2 transition-all duration-200 active:scale-[0.98]"
          >
            {t("onboardingNext")}
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  // ── Step 3: Open Project ──────────────────────────────────────────────────

  const renderProject = () => (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2 anim-1">
        <h1 className="text-[18px] font-semibold text-[#e4e4e7] tracking-tight">
          {t("onboardingProjectTitle")}
        </h1>
        <p className="text-[13px] text-[#71717a] text-center">
          {t("onboardingProjectDesc")}
        </p>
      </div>

      {/* Choose folder button */}
      <div className="w-full anim-2">
        <Button
          variant="ghost"
          onClick={handleOpenFolder}
          className="w-full h-auto flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all duration-200 group active:scale-[0.995]"
        >
          <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-[#71717a] group-hover:text-[#a1a1aa] transition-colors">
            <FolderOpen className="size-4" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-[13px] text-[#e4e4e7] font-medium">
              {t("onboardingProjectOpen")}
            </div>
            {selectedPath && (
              <div className="text-[11px] text-[#52525c] mt-0.5 font-mono truncate">
                {selectedPath}
              </div>
            )}
          </div>
          <ChevronRight className="size-3.5 text-[#3f3f46] group-hover:text-[#52525c] transition-colors" />
        </Button>
      </div>

      {/* Recent projects */}
      {recentProjects.length > 0 && (
        <div className="w-full anim-3">
          <div className="text-[10px] text-[#3f3f46] font-medium uppercase tracking-[0.08em] px-1 mb-2">
            {t("onboardingProjectRecent")}
          </div>
          <div className="flex flex-col gap-px">
            {recentProjects.map((p) => (
              <Button
                key={p.path}
                variant="ghost"
                onClick={() => handleSelectRecent(p.path)}
                className={cn(
                  "w-full justify-start gap-2.5 h-auto px-3 py-2 rounded-lg hover:bg-white/[0.025] group",
                  selectedPath === p.path && "bg-white/[0.03]"
                )}
              >
                <Folder
                  className={cn(
                    "size-3 shrink-0 transition-colors",
                    selectedPath === p.path
                      ? "fill-[#14b8a6]/30 text-[#14b8a6]"
                      : "fill-[#3f3f46] text-[#3f3f46]"
                  )}
                />
                <span
                  className={cn(
                    "text-[12px] truncate flex-1 text-left transition-colors",
                    selectedPath === p.path
                      ? "text-[#e4e4e7]"
                      : "text-[#71717a] group-hover:text-[#a1a1aa]"
                  )}
                >
                  {p.name}
                </span>
                <span className="text-[10px] text-[#27272a] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                  {p.path.replace(/\/[^/]+$/, "/")}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="w-full flex gap-2 anim-4">
        <Button
          variant="ghost"
          onClick={() => goToStep(1)}
          className="h-10 px-4 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] text-[#71717a] hover:text-[#a1a1aa] text-[13px] font-medium gap-2 transition-all duration-200"
        >
          <ArrowLeft className="size-3.5" />
          {t("onboardingBack")}
        </Button>
        <Button
          disabled={!selectedPath}
          onClick={() => onComplete(selectedPath ?? undefined)}
          className={cn(
            "flex-1 h-10 rounded-xl text-white text-[13px] font-medium gap-2 transition-all duration-200 active:scale-[0.98]",
            selectedPath
              ? "bg-[#14b8a6] hover:bg-[#14b8a6]/90"
              : "bg-[#14b8a6]/40 cursor-not-allowed"
          )}
        >
          {t("onboardingGetStarted")}
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const steps = [renderWelcome, renderCliTools, renderProject];

  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--bg-base)]">
      <div className="flex flex-col items-center max-w-[400px] w-full px-6">
        {/* Step content */}
        <div className={cn("w-full", direction === "right"
          ? "motion-safe:animate-[step-slide-left_0.25s_ease_both]"
          : "motion-safe:animate-[step-slide-right_0.25s_ease_both]"
        )} key={step}>
          {steps[step]()}
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center gap-2 mt-8 anim-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                i === step
                  ? "bg-[#14b8a6] w-4"
                  : "bg-[#27272a]"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
