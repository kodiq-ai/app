// ── Analytics — Sentry + PostHog ─────────────────────────────────────────────
// Unified init, tracking, and opt-out. Replaces standalone sentry.ts.

import * as Sentry from "@sentry/browser";
import posthog from "posthog-js";

const STORAGE_KEY = "kodiq:telemetry-opt-out";

let initialized = false;

// -- Opt-out -------

export function isOptedOut(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setOptOut(value: boolean): void {
  if (value) {
    localStorage.setItem(STORAGE_KEY, "true");
    posthog.opt_out_capturing();
  } else {
    localStorage.removeItem(STORAGE_KEY);
    posthog.opt_in_capturing();
  }
}

// -- Init -------

export function initAnalytics(): void {
  if (isOptedOut()) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    Sentry.init({
      dsn,
      release: `kodiq@${__APP_VERSION__}`,
      environment: import.meta.env.DEV ? "development" : "production",
      tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,
    });
  }

  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      persistence: "localStorage",
    });
    posthog.register({ $product: "Kodiq IDE" });
  }

  initialized = true;
}

// -- Tracking -------

export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (!initialized || isOptedOut()) return;
  posthog.capture(name, props);
}

export function identifyUser(id: string, traits?: Record<string, unknown>): void {
  if (!initialized || isOptedOut()) return;
  posthog.identify(id, traits);
}
