import { X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// -- InspectOverlay ──────────────────────────────────────
// Shows the result of preview.inspect() when inspect mode is active.
// Rendered as a slide-up panel at the bottom of the preview area.

export function InspectOverlay() {
  const inspectResult = useAppStore((s) => s.inspectResult);
  const clearInspectResult = useAppStore((s) => s.clearInspectResult);
  const setInspectMode = useAppStore((s) => s.setInspectMode);

  if (!inspectResult) {
    return (
      <div className="text-k-text-tertiary flex items-center justify-center py-6 text-[11px]">
        {t("noInspectResult")}
      </div>
    );
  }

  const { tagName, id, className, textContent, boundingBox, computedStyles } = inspectResult;

  // -- Compact selector display ────────────────────────────
  const selector = [
    tagName,
    id ? `#${id}` : null,
    className ? `.${className.split(" ").filter(Boolean).slice(0, 2).join(".")}` : null,
  ]
    .filter(Boolean)
    .join("");

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Header: selector + close */}
      <div className="flex items-center justify-between gap-2">
        <code className="text-k-accent truncate text-[11px] font-medium">{selector}</code>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => {
            clearInspectResult();
            setInspectMode(false);
          }}
          className="text-k-text-tertiary hover:text-k-text-secondary shrink-0"
          aria-label="close"
        >
          <X className="size-3" />
        </Button>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[10px]">
        <Row label={t("tagName")} value={`<${tagName}>`} />
        {id && <Row label="ID" value={`#${id}`} />}
        {className && <Row label={t("className")} value={className} />}
        <Row
          label={t("boundingBox")}
          value={`${Math.round(boundingBox.width)} \u00d7 ${Math.round(boundingBox.height)} @ ${Math.round(boundingBox.x)},${Math.round(boundingBox.y)}`}
        />
        {textContent && <Row label={t("textContent")} value={textContent.slice(0, 120)} truncate />}
      </div>

      {/* Computed styles */}
      {Object.keys(computedStyles).length > 0 && (
        <div className="mt-1">
          <p className="text-k-text-tertiary mb-1 text-[9px] font-medium tracking-wider uppercase">
            {t("computedStyles")}
          </p>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[10px]">
            {Object.entries(computedStyles).map(([prop, val]) => (
              <StyleRow key={prop} prop={prop} value={val} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -- Helpers ────────────────────────────────────────────

function Row({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <>
      <span className="text-k-text-tertiary whitespace-nowrap">{label}</span>
      <span
        className={cn("text-k-text-secondary font-mono", truncate && "truncate")}
        title={truncate ? value : undefined}
      >
        {value}
      </span>
    </>
  );
}

function StyleRow({ prop, value }: { prop: string; value: string }) {
  const isColor = prop.includes("color") && value.startsWith("rgb");

  return (
    <>
      <span className="text-k-text-tertiary font-mono whitespace-nowrap">{prop}</span>
      <span className="text-k-text-secondary flex items-center gap-1.5 font-mono">
        {isColor && (
          <span
            className="inline-block size-2.5 shrink-0 rounded-sm border border-white/10"
            style={{ backgroundColor: value }}
          />
        )}
        <span className="truncate">{value}</span>
      </span>
    </>
  );
}
