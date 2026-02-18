// ── Vertical Split Drag ─────────────────────────────────────────────────────
// Y-axis drag for editor/terminal split. Clone of useSplitDrag but vertical.

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";

export function useVerticalSplit() {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const setEditorSplitRatio = useAppStore((s) => s.setEditorSplitRatio);

  useEffect(() => {
    if (!isDragging) return;

    const move = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;
      setEditorSplitRatio(Math.min(0.8, Math.max(0.2, ratio)));
    };

    const up = () => setIsDragging(false);

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, setEditorSplitRatio]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  return { containerRef, isDragging, startDrag };
}
