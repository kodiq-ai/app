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
  gemini: "https://github.com/google-gemini/gemini-cli",
  codex: "https://github.com/openai/codex",
  claude: "https://docs.anthropic.com/en/docs/claude-code/overview",
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

      <div className="anim-2 flex flex-col items-center gap-2">
        <h1 className="text-[18px] font-semibold tracking-tight text-[#E6E6E9]">
          {t("onboardingWelcome")}
        </h1>
        <p className="text-center text-[13px] text-[#A1A1A8]">{t("onboardingWelcomeDesc")}</p>
      </div>

      <div className="anim-3 w-full">
        <Button
          onClick={() => goToStep(1)}
          className="h-10 w-full gap-2 rounded-xl bg-[#4DA3C7] text-[13px] font-medium text-white transition-all duration-200 hover:bg-[#4DA3C7]/90 active:scale-[0.98]"
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
        <div className="anim-1 flex flex-col items-center gap-2">
          <h1 className="text-[18px] font-semibold tracking-tight text-[#E6E6E9]">
            {t("onboardingCliTitle")}
          </h1>
          <p className="text-center text-[13px] text-[#A1A1A8]">{t("onboardingCliDesc")}</p>
        </div>

        {/* CLI tool list */}
        <div className="anim-2 flex w-full flex-col gap-px">
          {installedCli.map((tool) => (
            <div key={tool.name} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <div
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                style={{ background: CLI_COLORS[tool.provider] }}
              >
                <Check className="size-2.5 text-white" strokeWidth={3} />
              </div>
              <span className="flex-1 text-[12px] text-[#E6E6E9]">{tool.name}</span>
              <span className="font-mono text-[10px] text-[#6E6E76]">{tool.version}</span>
            </div>
          ))}

          {notInstalledCli.map((tool) => (
            <div key={tool.name} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <div
                className="h-4 w-4 shrink-0 rounded-full opacity-25"
                style={{ background: CLI_COLORS[tool.provider] }}
              />
              <span className="flex-1 text-[12px] text-[#6E6E76]">{tool.name}</span>
              {INSTALL_URLS[tool.bin] && (
                <Button
                  variant="ghost"
                  onClick={() => open(INSTALL_URLS[tool.bin] ?? "")}
                  className="h-6 rounded-md px-2.5 text-[10px] font-medium text-[#4DA3C7] hover:bg-[#4DA3C7]/10 hover:text-[#4DA3C7]"
                >
                  {t("onboardingCliInstall")}
                </Button>
              )}
            </div>
          ))}

          {cliTools.length === 0 && (
            <div className="flex flex-col items-center gap-1 py-4 text-center">
              <span className="text-[12px] text-[#6E6E76]">{t("onboardingCliNoneFound")}</span>
              <span className="text-[11px] text-[#6E6E76]">{t("onboardingCliNoneFoundDesc")}</span>
            </div>
          )}
        </div>

        {/* Shell info */}
        <div className="anim-3 flex w-full items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.01] px-3 py-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.03] text-[#6E6E76]">
            <Terminal className="size-3.5" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] tracking-[0.06em] text-[#6E6E76] uppercase">
              {t("onboardingShellDetected")}
            </div>
            <div className="font-mono text-[12px] text-[#A1A1A8]">{defaultShell}</div>
          </div>
        </div>

        {/* Navigation */}
        <div className="anim-4 flex w-full gap-2">
          <Button
            variant="ghost"
            onClick={() => goToStep(0)}
            className="h-10 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 text-[13px] font-medium text-[#A1A1A8] transition-all duration-200 hover:bg-white/[0.03] hover:text-[#A1A1A8]"
          >
            <ArrowLeft className="size-3.5" />
            {t("onboardingBack")}
          </Button>
          <Button
            onClick={() => goToStep(2)}
            className="h-10 flex-1 gap-2 rounded-xl bg-[#4DA3C7] text-[13px] font-medium text-white transition-all duration-200 hover:bg-[#4DA3C7]/90 active:scale-[0.98]"
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
      <div className="anim-1 flex flex-col items-center gap-2">
        <h1 className="text-[18px] font-semibold tracking-tight text-[#E6E6E9]">
          {t("onboardingProjectTitle")}
        </h1>
        <p className="text-center text-[13px] text-[#A1A1A8]">{t("onboardingProjectDesc")}</p>
      </div>

      {/* Choose folder button */}
      <div className="anim-2 w-full">
        <Button
          variant="ghost"
          onClick={handleOpenFolder}
          className="group flex h-auto w-full items-center gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-3.5 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.03] active:scale-[0.995]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] text-[#A1A1A8] transition-colors group-hover:text-[#A1A1A8]">
            <FolderOpen className="size-4" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-[13px] font-medium text-[#E6E6E9]">
              {t("onboardingProjectOpen")}
            </div>
            {selectedPath && (
              <div className="mt-0.5 truncate font-mono text-[11px] text-[#6E6E76]">
                {selectedPath}
              </div>
            )}
          </div>
          <ChevronRight className="size-3.5 text-[#6E6E76] transition-colors group-hover:text-[#6E6E76]" />
        </Button>
      </div>

      {/* Recent projects */}
      {recentProjects.length > 0 && (
        <div className="anim-3 w-full">
          <div className="mb-2 px-1 text-[10px] font-medium tracking-[0.08em] text-[#6E6E76] uppercase">
            {t("onboardingProjectRecent")}
          </div>
          <div className="flex flex-col gap-px">
            {recentProjects.map((p) => (
              <Button
                key={p.path}
                variant="ghost"
                onClick={() => handleSelectRecent(p.path)}
                className={cn(
                  "group h-auto w-full justify-start gap-2.5 rounded-lg px-3 py-2 hover:bg-white/[0.025]",
                  selectedPath === p.path && "bg-white/[0.03]",
                )}
              >
                <Folder
                  className={cn(
                    "size-3 shrink-0 transition-colors",
                    selectedPath === p.path
                      ? "fill-[#4DA3C7]/30 text-[#4DA3C7]"
                      : "fill-[#6E6E76] text-[#6E6E76]",
                  )}
                />
                <span
                  className={cn(
                    "flex-1 truncate text-left text-[12px] transition-colors",
                    selectedPath === p.path
                      ? "text-[#E6E6E9]"
                      : "text-[#A1A1A8] group-hover:text-[#A1A1A8]",
                  )}
                >
                  {p.name}
                </span>
                <span className="font-mono text-[10px] text-[#202024] opacity-0 transition-opacity group-hover:opacity-100">
                  {p.path.replace(/\/[^/]+$/, "/")}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="anim-4 flex w-full gap-2">
        <Button
          variant="ghost"
          onClick={() => goToStep(1)}
          className="h-10 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 text-[13px] font-medium text-[#A1A1A8] transition-all duration-200 hover:bg-white/[0.03] hover:text-[#A1A1A8]"
        >
          <ArrowLeft className="size-3.5" />
          {t("onboardingBack")}
        </Button>
        <Button
          disabled={!selectedPath}
          onClick={() => onComplete(selectedPath ?? undefined)}
          className={cn(
            "h-10 flex-1 gap-2 rounded-xl text-[13px] font-medium text-white transition-all duration-200 active:scale-[0.98]",
            selectedPath
              ? "bg-[#4DA3C7] hover:bg-[#4DA3C7]/90"
              : "cursor-not-allowed bg-[#4DA3C7]/40",
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
    <div className="flex flex-1 items-center justify-center bg-[var(--bg-base)]">
      <div className="flex w-full max-w-[400px] flex-col items-center px-6">
        {/* Step content */}
        <div
          className={cn(
            "w-full",
            direction === "right"
              ? "motion-safe:animate-[step-slide-left_0.25s_ease_both]"
              : "motion-safe:animate-[step-slide-right_0.25s_ease_both]",
          )}
          key={step}
        >
          {steps[step]?.()}
        </div>

        {/* Step indicator dots */}
        <div className="anim-4 mt-8 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-all duration-300",
                i === step ? "w-4 bg-[#4DA3C7]" : "bg-[#202024]",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
