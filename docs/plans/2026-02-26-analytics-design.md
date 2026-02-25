# Analytics Integration — Sentry + PostHog

**Date:** 2026-02-26
**Status:** Approved

## Goal

Centralized analytics module for error tracking (Sentry) and product analytics (PostHog) with opt-out support.

## Decisions

- **PostHog: product analytics only** — no session replay, no feature flags (add later)
- **Opt-out model** — telemetry on by default, user can disable (VS Code pattern)
- **Single `analytics.ts` module** — replaces standalone `sentry.ts`, wraps both SDKs

## Events

| Event | Params | Source |
|-------|--------|--------|
| `app_launched` | `version` | `main.tsx` |
| `app_closed` | `session_duration_s` | `main.tsx` (beforeunload) |
| `project_opened` | — | `useProjectStore.openProject()` |
| `feature_used` | `feature: terminal \| editor \| git_panel \| preview` | respective stores |
| `file_opened` | `language` | `useEditorStore.openTab()` |

## Architecture

### File changes

- **Create** `src/shared/lib/analytics.ts` — unified init, track, opt-out
- **Delete** `src/shared/lib/sentry.ts` — logic moves into analytics.ts
- **Edit** `src/shared/lib/errors.ts` — import Sentry from analytics or directly
- **Edit** `src/main.tsx` — replace `initSentry()` with `initAnalytics()`, add app events
- **Edit** `src/shared/components/ErrorBoundary.tsx` — keep Sentry.captureException as-is
- **Edit** `src-tauri/tauri.conf.json` — add PostHog to CSP connect-src
- **Edit** `.env.example` — add `VITE_SENTRY_DSN` and `VITE_POSTHOG_KEY`

### Public API (`analytics.ts`)

```ts
initAnalytics(): void
trackEvent(name: string, props?: Record<string, unknown>): void
identifyUser(id: string, traits?: Record<string, unknown>): void
setOptOut(value: boolean): void
isOptedOut(): boolean
```

### Opt-out

- Stored in `localStorage` key `kodiq:telemetry-opt-out`
- When opted out: PostHog disabled, Sentry disabled
- No UI toggle yet (no Settings page) — API ready for future use

### Infrastructure

- New dependency: `posthog-js`
- CSP: add `https://*.posthog.com https://*.i.posthog.com` to connect-src
- Env vars: `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`
