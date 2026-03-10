// ── Profile Button ──────────────────────────────────────────────────────────
// Avatar/initials in the ActivityBar bottom — shows auth state and profile dropdown.

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
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-k-text-tertiary hover:text-k-text-secondary relative size-7"
                aria-label={t("signIn")}
              >
                <User className="size-4" />
                <span className="bg-k-accent absolute right-1 bottom-1 size-1.5 rounded-full" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="left">{t("signIn")}</TooltipContent>
        </Tooltip>

        <DropdownMenuContent side="top" align="end" className="min-w-[10rem]">
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
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className={cn(
                "relative size-7 overflow-hidden rounded-full p-0",
                "text-k-text-tertiary hover:text-k-text-secondary",
              )}
              aria-label={t("profile")}
            >
              <Avatar size="sm">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? email ?? ""} />}
                <AvatarFallback className="text-k-text-secondary bg-white/[0.08] text-[10px]">
                  {getInitials(fullName, email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="left">{t("profile")}</TooltipContent>
      </Tooltip>

      <DropdownMenuContent side="top" align="end" className="min-w-[12rem]">
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
