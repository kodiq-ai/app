// ── Profile Button ──────────────────────────────────────────────────────────
// Sidebar profile button — shows auth state with avatar + name/email.

import { User, LogOut, LogIn } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// ── Helpers ─────────────────────────────────────────────────

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email.charAt(0).toUpperCase();
  return "?";
}

// ── Component ───────────────────────────────────────────────

export function ProfileButton() {
  const user = useAppStore((s) => s.academyUser);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const signOut = useAppStore((s) => s.signOut);
  const signInWithOAuth = useAppStore((s) => s.signInWithOAuth);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const fullName = user?.user_metadata?.full_name as string | undefined;
  const email = user?.email;

  if (!isAuthenticated) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
              "text-k-text-tertiary hover:text-k-text-secondary transition-colors hover:bg-white/[0.04]",
            )}
            aria-label={t("signIn")}
          >
            <User className="size-4 shrink-0" />
            <span className="truncate text-[11px]">{t("signIn")}</span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" className="min-w-[10rem]">
          <DropdownMenuItem onClick={() => signInWithOAuth("github")}>
            <LogIn className="size-4" />
            {t("signIn")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
            "text-k-text-tertiary hover:text-k-text-secondary transition-colors hover:bg-white/[0.04]",
          )}
          aria-label={t("profile")}
        >
          <Avatar size="sm" className="size-5 shrink-0">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? email ?? ""} />}
            <AvatarFallback className="text-k-text-secondary bg-white/[0.08] text-[9px]">
              {getInitials(fullName, email)}
            </AvatarFallback>
          </Avatar>
          <span className="text-k-text-secondary truncate text-[11px]">{fullName || email}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="min-w-[12rem]">
        <DropdownMenuLabel className="text-xs font-normal">
          <span className="text-k-text-secondary">{t("signedInAs")}</span>
          <p className="text-k-text truncate text-sm font-medium">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut className="size-4" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
