import { Folder, FileText } from "lucide-react";

// ─── Kodiq Logo (geometric K) ────────────────────────────────────────────────

export function KodiqIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      {/* Background */}
      <rect width="512" height="512" rx="114" fill="#0f1217" />
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
      <rect width="512" height="512" rx="114" fill="#161a21" />
      <path
        d="M29 79H150.658V222.556L304.758 79H414.25L262.583 221.745L484 432.619H332.333L150.658 260.676V336.914H29V79Z"
        fill="#f4f4f5"
      />
      <path d="M29 432.621V353.949H221.219L304.758 432.621H29Z" fill="#f4f4f5" />
      <path d="M170.124 177.948L170.124 79L276.295 79L170.124 177.948Z" fill="#f4f4f5" />
    </svg>
  );
}

// ─── Kodiq Logo (K + wordmark) ───────────────────────────────────────────────

export function KodiqLogo({ height = 20, className }: { height?: number; className?: string }) {
  const w = Math.round(height * (1024 / 258));
  return (
    <svg width={w} height={height} viewBox="0 0 1024 258" fill="currentColor" className={className}>
      <path d="M89 18.9355H164.716V108.28L260.623 18.9355H328.767L234.375 107.776L372.178 239.017H277.785L164.716 132.005V179.454H89V18.9355Z" />
      <path d="M89 239.018V190.055H208.631L260.623 239.018H89Z" />
      <path d="M176.831 80.5179L176.831 18.9355L242.908 18.9355L176.831 80.5179Z" />
      <path d="M404.988 85.5664H425.179V126.958L471.618 85.5664H496.352L451.218 124.939L497.362 172.387H472.628L437.909 136.549L425.179 147.654V172.387H404.988V85.5664Z" />
      <path d="M559.954 83.5469C596.628 83.5469 615.984 102.311 615.984 128.977C615.984 155.642 596.628 174.406 559.954 174.406C523.28 174.406 503.924 155.642 503.924 128.977C503.924 102.312 523.28 83.5469 559.954 83.5469ZM559.954 97.6805C536.496 97.6805 524.115 110.607 524.115 128.977C524.115 147.346 536.495 160.272 559.954 160.272C583.412 160.272 595.793 147.346 595.793 128.977C595.793 110.607 583.412 97.6805 559.954 97.6805Z" />
      <path d="M680.596 84.5547C720.904 84.5547 742.178 102.31 742.178 128.976C742.177 155.641 720.904 172.891 680.596 172.891H641.729V84.5547H680.596ZM661.919 98.6885V158.757H680.596C706.378 158.757 722.491 147.344 722.491 128.975C722.491 110.606 706.378 98.6886 680.596 98.6885H661.919Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M871.903 83.5469C908.577 83.5469 927.933 102.311 927.933 128.977C927.933 140.007 924.62 149.686 918.14 157.244C917.983 157.427 917.821 157.606 917.661 157.786L935 172.387H911.78L905.568 167.156C896.819 171.801 885.563 174.406 871.903 174.406C835.229 174.406 815.873 155.642 815.873 128.977C815.873 102.312 835.229 83.5469 871.903 83.5469ZM871.903 97.6805C848.445 97.6805 836.064 110.607 836.064 128.977C836.064 147.346 848.445 160.272 871.903 160.272C880.028 160.272 886.824 158.72 892.237 155.93L873.417 140.082H896.637L903.366 145.748C906.265 141.012 907.742 135.319 907.742 128.977C907.742 110.607 895.361 97.6805 871.903 97.6805Z"
      />
      <rect x="769.436" y="85.5664" width="20.1909" height="86.8211" />
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
