import { Folder, FileText } from "lucide-react";

// ─── Kodiq Logo (K + lightning bolt) ─────────────────────────────────────────

export function KodiqIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
      <defs>
        <radialGradient id="ki-bg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>
        <linearGradient id="ki-bolt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      {/* Background */}
      <rect width="1024" height="1024" rx="228" fill="url(#ki-bg)" />
      <rect
        x="2"
        y="2"
        width="1020"
        height="1020"
        rx="226"
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth="4"
      />
      {/* K — vertical stroke */}
      <path d="M310 260L310 764" stroke="#f4f4f5" strokeWidth="56" strokeLinecap="round" />
      {/* K — upper diagonal */}
      <path
        d="M338 512L600 280"
        stroke="#f4f4f5"
        strokeWidth="56"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lightning bolt (replaces K lower diagonal) */}
      <path d="M440 500L580 500L500 620L680 620L400 800L470 650L338 650Z" fill="url(#ki-bolt)" />
    </svg>
  );
}

// ─── Kodiq Dot (title bar — mini logo) ──────────────────────────────────────

export function KodiqDot({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
      <defs>
        <linearGradient id="kd-bolt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="228" fill="#111113" />
      <path d="M310 260L310 764" stroke="#f4f4f5" strokeWidth="56" strokeLinecap="round" />
      <path
        d="M338 512L600 280"
        stroke="#f4f4f5"
        strokeWidth="56"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M440 500L580 500L500 620L680 620L400 800L470 650L338 650Z" fill="url(#kd-bolt)" />
    </svg>
  );
}

// ─── Tab Icon (shell / CLI tools) ───────────────────────────────────────────

export function TabIconSvg({ icon, size = 12 }: { icon: string; size?: number }) {
  const s = { width: size, height: size };
  switch (icon) {
    case "shell":
      return (
        <svg
          {...s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 17l6-5-6-5" />
          <path d="M12 19h8" />
        </svg>
      );
    case "claude":
      return (
        <svg {...s} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#D97757" />
          <path d="M8 12l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" />
        </svg>
      );
    case "gemini":
      return (
        <svg {...s} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#4285F4" />
          <path d="M12 6v12M7 9l5 3 5-3M7 15l5-3 5 3" stroke="#fff" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case "codex":
      return (
        <svg {...s} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#10A37F" />
          <path
            d="M8 12h8M12 8v8"
            stroke="#fff"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      );
  }
}

// ─── File Icon (color-coded by extension) ───────────────────────────────────

export function FileIcon({ name, isDir }: { name: string; isDir: boolean }) {
  if (isDir) return <Folder className="size-3 fill-[#52525b] text-[#52525b]" />;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const colors: Record<string, string> = {
    ts: "#3b82f6",
    tsx: "#3b82f6",
    js: "#eab308",
    jsx: "#eab308",
    json: "#a3a3a3",
    css: "#a855f7",
    html: "#f97316",
    md: "#52525b",
    rs: "#f97316",
    toml: "#52525b",
    lock: "#3f3f46",
    gitignore: "#3f3f46",
    svg: "#60a5fa",
  };
  return <FileText className="size-3" style={{ color: colors[ext] || "#3f3f46" }} />;
}
