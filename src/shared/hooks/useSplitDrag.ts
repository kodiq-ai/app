import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";

export function useSplitDrag() {
  const [isDragging, setIsDragging] = useState(false);
  const panelsRef = useRef<HTMLDivElement>(null);
  const setSplitRatio = useAppStore((s) => s.setSplitRatio);

  useEffect(() => {
    if (!isDragging) return;
    const move = (e: MouseEvent) => {
      if (!panelsRef.current) return;
      const r = panelsRef.current.getBoundingClientRect();
      setSplitRatio(Math.min(0.8, Math.max(0.2, (e.clientX - r.left) / r.width)));
    };
    const up = () => setIsDragging(false);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, setSplitRatio]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  return { panelsRef, isDragging, startDrag };
}
