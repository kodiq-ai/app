import { useState, useCallback, useRef, useEffect } from "react";
import TerminalPanel from "./components/TerminalPanel";
import Preview from "./components/Preview";

export default function App() {
  const [splitRatio, setSplitRatio] = useState(() => {
    const saved = localStorage.getItem("kodiq-split-ratio");
    return saved ? parseFloat(saved) : 0.5;
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("kodiq-split-ratio", String(splitRatio));
  }, [splitRatio]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.min(0.8, Math.max(0.2, ratio)));
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0a]">
      {/* Title bar */}
      <header
        className="flex items-center h-11 px-4 bg-[#141414] border-b border-[#1e1e1e] shrink-0 select-none"
        data-tauri-drag-region
      >
        {/* Traffic lights area (macOS spacing) */}
        <div className="w-[70px] shrink-0" />

        {/* Center: App name */}
        <div className="flex-1 flex items-center justify-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#14b8a6] shadow-[0_0_6px_#14b8a680]" />
          <span className="text-[13px] font-medium text-neutral-400 tracking-wide">
            Kodiq
          </span>
        </div>

        {/* Right spacer */}
        <div className="w-[70px] shrink-0" />
      </header>

      {/* Main content */}
      <div
        ref={containerRef}
        className="flex flex-1 overflow-hidden"
        style={{ cursor: isDragging ? "col-resize" : undefined }}
      >
        {/* Terminal panel */}
        <div
          className="relative overflow-hidden bg-[#0d0d0d]"
          style={{ width: `${splitRatio * 100}%` }}
        >
          <TerminalPanel />
        </div>

        {/* Divider */}
        <div
          className="w-[3px] cursor-col-resize shrink-0 group relative"
          onMouseDown={handleMouseDown}
        >
          <div
            className={`absolute inset-0 transition-colors ${
              isDragging
                ? "bg-[#14b8a6]"
                : "bg-[#1e1e1e] group-hover:bg-[#14b8a680]"
            }`}
          />
        </div>

        {/* Preview panel */}
        <div className="relative flex-1 overflow-hidden bg-[#0d0d0d]">
          <Preview />
        </div>
      </div>
    </div>
  );
}
