import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "size-3",
  md: "size-4",
  lg: "size-5",
} as const;

export function Loader({ size = "md", className }: LoaderProps) {
  return (
    <svg
      className={cn("kodiq-spinner text-k-accent", SIZES[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      <path d="M12 2v4" opacity={0.3} />
      <path d="M12 18v4" opacity={0.3} />
      <path d="M4.93 4.93l2.83 2.83" opacity={0.4} />
      <path d="M16.24 16.24l2.83 2.83" opacity={0.4} />
      <path d="M2 12h4" opacity={0.6} />
      <path d="M18 12h4" opacity={0.6} />
      <path d="M4.93 19.07l2.83-2.83" opacity={0.8} />
      <path d="M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
