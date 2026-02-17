// ── Centralized Error Handling ────────────────────────────────────────────────
// No silent catch {} blocks — every error goes through here.

import { toast } from "sonner";
import * as Sentry from "@sentry/browser";

/**
 * Handle any error with console logging + toast notification.
 * @param error - The error caught (can be Error, string, or unknown)
 * @param context - Optional prefix (e.g., "Terminal spawn", "File read")
 */
export function handleError(error: unknown, context?: string): void {
  const message = error instanceof Error ? error.message : String(error);
  const prefix = context ? `${context}: ` : "";

  console.error(`[Kodiq] ${prefix}${message}`);
  toast.error(`${prefix}${message}`);
  Sentry.captureException(error instanceof Error ? error : new Error(message), {
    tags: { context: context || "unknown" },
  });
}

/**
 * Wrap an async operation with error handling.
 * Returns the result or null if an error occurs.
 */
export async function trySafe<T>(fn: () => Promise<T>, context?: string): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    handleError(e, context);
    return null;
  }
}
