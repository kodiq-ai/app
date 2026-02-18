import * as Sentry from "@sentry/browser";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    release: `kodiq@${__APP_VERSION__}`,
    environment: import.meta.env.DEV ? "development" : "production",
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,
  });
}
