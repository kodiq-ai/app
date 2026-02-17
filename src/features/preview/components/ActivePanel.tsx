import type React from "react";
import { RefreshCw, Monitor, Tablet, Smartphone, Zap, Globe } from "lucide-react";
import { useAppStore, type Viewport } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { t } from "@/lib/i18n";

function getViewportStyle(viewport: Viewport): React.CSSProperties {
  if (viewport === "tablet") {
    return { width: 768, height: "100%", maxHeight: 1024, borderRadius: 8, boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" };
  }
  if (viewport === "mobile") {
    return { width: 390, height: "100%", maxHeight: 844, borderRadius: 12, boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" };
  }
  return { width: "100%", height: "100%" };
}

export function ActivePanel() {
  const viewport = useAppStore((s) => s.viewport);
  const setViewport = useAppStore((s) => s.setViewport);
  const previewUrl = useAppStore((s) => s.previewUrl);
  const setPreviewUrl = useAppStore((s) => s.setPreviewUrl);

  const viewportOptions: { v: Viewport; icon: typeof Monitor; label: string }[] = [
    { v: "desktop", icon: Monitor, label: t("desktop") },
    { v: "tablet", icon: Tablet, label: t("tablet") },
    { v: "mobile", icon: Smartphone, label: t("mobile") },
  ];

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[var(--bg-base)]">
      {/* Toolbar */}
      <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-white/[0.06] px-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() =>
                previewUrl && setPreviewUrl(`${previewUrl.split("?")[0]}?_r=${Date.now()}`)
              }
              className="text-[#52525c] hover:text-[#a1a1aa]"
            >
              <RefreshCw className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("refresh")}</TooltipContent>
        </Tooltip>

        <Input
          type="text"
          value={previewUrl?.split("?")[0] || ""}
          readOnly
          placeholder={t("waitingForServer")}
          className="h-7 flex-1 border-white/[0.06] bg-white/[0.015] px-2.5 font-mono text-[11px] text-[#71717a] focus:border-[#06b6d4]/40"
        />

        <div className="flex shrink-0 items-center gap-px">
          {viewportOptions.map(({ v, icon: Icon, label }) => (
            <Tooltip key={v}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setViewport(v)}
                  className={cn(
                    "text-[#52525c] hover:text-[#a1a1aa]",
                    viewport === v && "bg-white/[0.04] !text-[#a1a1aa]",
                  )}
                >
                  <Icon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {previewUrl ? (
          <>
            <div className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium text-[#06b6d4]">
              <Zap className="size-2" />
              auto
            </div>
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/80" />
          </>
        ) : (
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3f3f46]" />
        )}
      </div>

      {/* Preview content */}
      <div className="relative flex-1 overflow-hidden">
        {previewUrl ? (
          <div className="flex h-full w-full items-center justify-center">
            <iframe
              key={previewUrl}
              src={previewUrl}
              className="border-0 bg-white"
              style={getViewportStyle(viewport)}
            />
          </div>
        ) : (
          <div className="flex h-full flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <Globe className="size-5 text-[#3f3f46]" />
              <div>
                <p className="text-[12px] text-[#52525c]">{t("serverNotRunning")}</p>
                <p className="mt-1 text-[11px] text-[#3f3f46]">
                  {t("runDevServer")}{" "}
                  <code className="font-mono text-[#52525c]">{t("npmRunDev")}</code>{" "}
                  {t("inTerminal")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
