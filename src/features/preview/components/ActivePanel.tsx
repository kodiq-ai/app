import { RefreshCw, Monitor, Tablet, Smartphone, Zap, Globe } from "lucide-react";
import { useAppStore, type Viewport } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { t } from "@/lib/i18n";

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
    <div className="relative flex-1 overflow-hidden bg-[var(--bg-base)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 h-9 px-2 border-b border-white/[0.06] shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => previewUrl && setPreviewUrl(previewUrl.split("?")[0] + "?_r=" + Date.now())}
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
          className="flex-1 h-7 px-2.5 bg-white/[0.015] border-white/[0.06] text-[11px] text-[#71717a] font-mono focus:border-[#14b8a6]/40"
        />

        <div className="flex items-center gap-px shrink-0">
          {viewportOptions.map(({ v, icon: Icon, label }) => (
            <Tooltip key={v}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setViewport(v)}
                  className={cn(
                    "text-[#52525c] hover:text-[#a1a1aa]",
                    viewport === v && "!text-[#a1a1aa] bg-white/[0.04]"
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
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-[#14b8a6] font-medium shrink-0">
              <Zap className="size-2" />
              auto
            </div>
            <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500/80" />
          </>
        ) : (
          <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#3f3f46]" />
        )}

      </div>

      {/* Preview content */}
      <div className="flex-1 relative overflow-hidden">
        {previewUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <iframe
              key={previewUrl}
              src={previewUrl}
              className="border-0 bg-white"
              style={
                viewport === "desktop"
                  ? { width: "100%", height: "100%" }
                  : viewport === "tablet"
                    ? { width: 768, height: "100%", maxHeight: 1024, borderRadius: 8, boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }
                    : { width: 390, height: "100%", maxHeight: 844, borderRadius: 12, boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }
              }
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center flex flex-col items-center gap-3">
              <Globe className="size-5 text-[#3f3f46]" />
              <div>
                <p className="text-[12px] text-[#52525c]">{t("serverNotRunning")}</p>
                <p className="text-[11px] text-[#3f3f46] mt-1">{t("runDevServer")} <code className="font-mono text-[#52525c]">{t("npmRunDev")}</code> {t("inTerminal")}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
