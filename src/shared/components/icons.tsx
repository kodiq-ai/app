import { Folder, FileText } from "lucide-react";

// ─── Kodiq Logo (K + KODIQ wordmark, monochrome) ────────────────────────────

export function KodiqIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
      <rect width="1024" height="1024" rx="228" fill="#111113" />
      {/* K symbol */}
      <path
        d="M189 174H361.727V377.818L580.515 174H735.969L520.636 376.667L835 676.06H619.666L361.727 431.939V540.182H189V174Z"
        fill="#f4f4f5"
      />
      <path d="M189 676.062V564.365H461.909L580.515 676.062H189Z" fill="#f4f4f5" />
      <path d="M389.364 314.485L389.364 174L540.104 174L389.364 314.485Z" fill="#f4f4f5" />
      {/* KODIQ wordmark */}
      <path
        d="M189 741.461H213.61V791.911L270.212 741.461H300.358L245.347 789.45L301.589 847.282H271.442L229.126 803.6L213.61 817.135V847.282H189V741.461Z"
        fill="#f4f4f5"
      />
      <path
        d="M377.878 739C422.578 739 446.169 761.871 446.169 794.372C446.169 826.872 422.578 849.743 377.878 849.743C333.178 849.743 309.586 826.873 309.586 794.373C309.586 761.872 333.178 739 377.878 739ZM377.878 756.227C349.286 756.227 334.196 771.982 334.196 794.372C334.196 816.761 349.286 832.516 377.878 832.516C406.469 832.516 421.56 816.761 421.56 794.372C421.56 771.982 406.469 756.227 377.878 756.227Z"
        fill="#f4f4f5"
      />
      <path
        d="M524.923 740.227C574.052 740.227 599.982 761.867 599.982 794.367C599.982 826.868 574.052 847.894 524.923 847.894H477.549V740.227H524.923ZM502.156 757.455V830.669H524.921C556.346 830.669 575.985 816.758 575.985 794.369C575.985 771.98 556.346 757.455 524.921 757.455H502.156Z"
        fill="#f4f4f5"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M758.094 739C802.794 739 826.386 761.871 826.386 794.372C826.386 807.816 822.349 819.613 814.45 828.825C814.259 829.048 814.062 829.266 813.866 829.486L834.999 847.282H806.698L799.127 840.906C788.463 846.568 774.743 849.743 758.094 849.743C713.395 849.743 689.803 826.873 689.803 794.373C689.803 761.872 713.394 739 758.094 739ZM758.094 756.227C729.503 756.227 714.413 771.982 714.412 794.372C714.412 816.761 729.502 832.516 758.094 832.516C767.998 832.516 776.281 830.625 782.878 827.223L759.94 807.907H788.241L796.444 814.814C799.976 809.041 801.776 802.102 801.776 794.372C801.776 771.982 786.686 756.227 758.094 756.227Z"
        fill="#f4f4f5"
      />
      <rect x="633.203" y="741.461" width="24.6096" height="105.821" fill="#f4f4f5" />
    </svg>
  );
}

// ─── Kodiq Dot (title bar — mini K icon) ────────────────────────────────────

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
