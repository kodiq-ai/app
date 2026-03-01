// ── Bug Report Dialog ────────────────────────────────────────────────────────
// Simplified feedback form for IDE — no auth, no Supabase, no history.
// Submits to kodiq.ai Web API with source:"ide" → GitHub issue in kodiq-ai/ide.

import { useState } from "react";
import { AlertCircle, CheckCircle, Loader2, Send } from "lucide-react";

import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { trackEvent } from "@shared/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/* ── Types & constants ───────────────────────── */

type FeedbackType = "bug" | "improvement" | "idea";
type SubmitState = "idle" | "loading" | "success" | "error";

const TYPES: { key: FeedbackType; emoji: string; labelKey: string }[] = [
  { key: "bug", emoji: "\u{1F41B}", labelKey: "bugTypeBug" },
  { key: "improvement", emoji: "\u2728", labelKey: "bugTypeImprovement" },
  { key: "idea", emoji: "\u{1F4A1}", labelKey: "bugTypeIdea" },
];

const TITLE_PLACEHOLDERS: Record<FeedbackType, string> = {
  bug: "bugTitlePlaceholderBug",
  improvement: "bugTitlePlaceholderImprovement",
  idea: "bugTitlePlaceholderIdea",
};

const DESC_PLACEHOLDERS: Record<FeedbackType, string> = {
  bug: "bugDescPlaceholderBug",
  improvement: "bugDescPlaceholderImprovement",
  idea: "bugDescPlaceholderIdea",
};

const FEEDBACK_API = "https://kodiq.ai/api/feedback";

/* ── Component ───────────────────────────────── */

export function BugReportDialog() {
  const open = useAppStore((s) => s.bugReportOpen);
  const setOpen = useAppStore((s) => s.setBugReportOpen);

  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  function reset() {
    setType("bug");
    setTitle("");
    setDescription("");
    setSubmitState("idle");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && submitState === "success") {
      setTimeout(reset, 200);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitState === "loading") return;
    setSubmitState("loading");

    try {
      const meta = [`**App:** Kodiq IDE v${__APP_VERSION__}`, `**OS:** ${navigator.platform}`].join(
        "\n",
      );

      const fullDescription = `${description.trim()}\n\n---\n${meta}`;

      const res = await fetch(FEEDBACK_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: fullDescription,
          source: "ide",
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setSubmitState("success");
      trackEvent("bug_report_submitted", { type });
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-k-bg-surface border-white/[0.06] sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-k-text text-[14px]">{t("bugReportTitle")}</DialogTitle>
          <DialogDescription className="text-k-text-tertiary text-[12px]">
            {t("bugReportDesc")}
          </DialogDescription>
        </DialogHeader>

        {submitState === "success" ? (
          <SuccessView
            onDone={() => {
              reset();
              setOpen(false);
            }}
          />
        ) : (
          <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
            {/* Type selector */}
            <div className="flex flex-col gap-2">
              <label className="text-k-text-secondary text-[11px] font-medium tracking-[0.06em] uppercase">
                {t("bugTitleLabel")}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {TYPES.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setType(opt.key)}
                    className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-[11px] transition-all ${
                      type === opt.key
                        ? "border-k-accent/50 bg-k-accent/10 text-k-accent"
                        : "text-k-text-tertiary border-white/[0.06] bg-white/[0.03] hover:border-white/[0.1]"
                    }`}
                  >
                    <span className="text-base">{opt.emoji}</span>
                    <span>{t(opt.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-k-text-secondary text-[11px] font-medium tracking-[0.06em] uppercase">
                {t("bugTitleLabel")}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t(TITLE_PLACEHOLDERS[type])}
                maxLength={200}
                required
                className="text-k-text placeholder:text-k-text-tertiary focus:border-k-accent/50 w-full rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[13px] transition-colors focus:outline-none"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-k-text-secondary text-[11px] font-medium tracking-[0.06em] uppercase">
                {t("bugDescLabel")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(DESC_PLACEHOLDERS[type])}
                maxLength={4000}
                required
                rows={4}
                className="text-k-text placeholder:text-k-text-tertiary focus:border-k-accent/50 w-full resize-none rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[13px] transition-colors focus:outline-none"
              />
            </div>

            {/* Error */}
            {submitState === "error" && (
              <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {t("bugError")}
              </div>
            )}

            {/* Submit */}
            <Button type="submit" disabled={submitState === "loading"} className="w-full" size="sm">
              {submitState === "loading" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              {submitState === "loading" ? t("bugSubmitting") : t("bugSubmit")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── SuccessView ──────────────────────────────── */

function SuccessView({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <CheckCircle className="text-k-accent h-10 w-10" />
      <p className="text-k-text text-[13px] font-medium">{t("bugSuccess")}</p>
      <Button variant="outline" size="sm" onClick={onDone} className="mt-1">
        {t("bugSuccessDone")}
      </Button>
    </div>
  );
}
