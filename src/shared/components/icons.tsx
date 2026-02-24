import { Folder, FileText } from "lucide-react";

// ─── Kodiq Logo (geometric K) ────────────────────────────────────────────────

export function KodiqIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      {/* Background */}
      <rect width="512" height="512" rx="114" fill="#0a0a0a" />
      <rect
        x="1"
        y="1"
        width="510"
        height="510"
        rx="113"
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth="2"
      />
      {/* K mark */}
      <path
        d="M29 79H150.658V222.556L304.758 79H414.25L262.583 221.745L484 432.619H332.333L150.658 260.676V336.914H29V79Z"
        fill="#f4f4f5"
      />
      <path d="M29 432.621V353.949H221.219L304.758 432.621H29Z" fill="#f4f4f5" />
      <path d="M170.124 177.948L170.124 79L276.295 79L170.124 177.948Z" fill="#f4f4f5" />
    </svg>
  );
}

// ─── Kodiq Dot (title bar — mini logo) ──────────────────────────────────────

export function KodiqDot({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <rect width="512" height="512" rx="114" fill="#111113" />
      <path
        d="M29 79H150.658V222.556L304.758 79H414.25L262.583 221.745L484 432.619H332.333L150.658 260.676V336.914H29V79Z"
        fill="#f4f4f5"
      />
      <path d="M29 432.621V353.949H221.219L304.758 432.621H29Z" fill="#f4f4f5" />
      <path d="M170.124 177.948L170.124 79L276.295 79L170.124 177.948Z" fill="#f4f4f5" />
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
  if (isDir) return <Folder className="fill-k-text-tertiary text-k-text-tertiary size-3" />;
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
