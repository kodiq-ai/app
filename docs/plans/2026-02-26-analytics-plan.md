# Analytics (Sentry + PostHog) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unified analytics module replacing standalone `sentry.ts` — wraps Sentry (errors) and PostHog (product analytics) with opt-out support.

**Architecture:** Single `analytics.ts` module that initializes both SDKs, checks `localStorage` opt-out flag, and exposes `trackEvent()` / `setOptOut()` API. Store slices call `trackEvent()` at key actions.

**Tech Stack:** `@sentry/browser` (existing), `posthog-js` (new), Zustand 5, Vitest, Vite env vars

---

### Task 1: Install `posthog-js`

**Files:**
- Modify: `package.json`

**Step 1: Install dependency**

Run: `cd ~/Projects/kodiq/app && pnpm add posthog-js`
Expected: posthog-js added to dependencies in package.json

**Step 2: Commit**

```bash
cd ~/Projects/kodiq/app
git add package.json pnpm-lock.yaml
git commit -m "feat(analytics): add posthog-js dependency"
```

---

### Task 2: Create `analytics.ts` — core module

**Files:**
- Create: `src/shared/lib/analytics.ts`
- Create: `src/shared/lib/__tests__/analytics.test.ts`

**Step 1: Write the failing test**

Create `src/shared/lib/__tests__/analytics.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @sentry/browser
vi.mock("@sentry/browser", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

// Mock posthog-js
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
    has_opted_out_capturing: vi.fn(() => false),
  },
}));

// Must import AFTER mocks
import * as Sentry from "@sentry/browser";
import posthog from "posthog-js";
import { initAnalytics, trackEvent, identifyUser, setOptOut, isOptedOut } from "../analytics";

const STORAGE_KEY = "kodiq:telemetry-opt-out";

describe("analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Provide env vars via import.meta.env
    vi.stubEnv("VITE_SENTRY_DSN", "https://fake@sentry.io/123");
    vi.stubEnv("VITE_POSTHOG_KEY", "phc_fake_key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("initAnalytics", () => {
    it("initializes Sentry and PostHog when env vars present", () => {
      initAnalytics();
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({ dsn: "https://fake@sentry.io/123" }),
      );
      expect(posthog.init).toHaveBeenCalledWith(
        "phc_fake_key",
        expect.objectContaining({ autocapture: false }),
      );
    });

    it("skips init when opted out", () => {
      localStorage.setItem(STORAGE_KEY, "true");
      initAnalytics();
      expect(Sentry.init).not.toHaveBeenCalled();
      expect(posthog.init).not.toHaveBeenCalled();
    });

    it("skips Sentry when DSN not provided", () => {
      vi.stubEnv("VITE_SENTRY_DSN", "");
      initAnalytics();
      expect(Sentry.init).not.toHaveBeenCalled();
      // PostHog should still init
      expect(posthog.init).toHaveBeenCalled();
    });

    it("skips PostHog when key not provided", () => {
      vi.stubEnv("VITE_POSTHOG_KEY", "");
      initAnalytics();
      expect(Sentry.init).toHaveBeenCalled();
      expect(posthog.init).not.toHaveBeenCalled();
    });
  });

  describe("trackEvent", () => {
    it("calls posthog.capture with event name and props", () => {
      initAnalytics();
      trackEvent("feature_used", { feature: "terminal" });
      expect(posthog.capture).toHaveBeenCalledWith("feature_used", { feature: "terminal" });
    });

    it("does nothing when opted out", () => {
      localStorage.setItem(STORAGE_KEY, "true");
      initAnalytics();
      trackEvent("feature_used", { feature: "terminal" });
      expect(posthog.capture).not.toHaveBeenCalled();
    });
  });

  describe("identifyUser", () => {
    it("calls posthog.identify", () => {
      initAnalytics();
      identifyUser("user-123", { plan: "pro" });
      expect(posthog.identify).toHaveBeenCalledWith("user-123", { plan: "pro" });
    });
  });

  describe("opt-out", () => {
    it("isOptedOut reads from localStorage", () => {
      expect(isOptedOut()).toBe(false);
      localStorage.setItem(STORAGE_KEY, "true");
      expect(isOptedOut()).toBe(true);
    });

    it("setOptOut(true) persists to localStorage", () => {
      setOptOut(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
      expect(isOptedOut()).toBe(true);
    });

    it("setOptOut(false) removes from localStorage", () => {
      localStorage.setItem(STORAGE_KEY, "true");
      setOptOut(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(isOptedOut()).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd ~/Projects/kodiq/app && pnpm vitest run src/shared/lib/__tests__/analytics.test.ts`
Expected: FAIL — `../analytics` module not found

**Step 3: Write minimal implementation**

Create `src/shared/lib/analytics.ts`:

```ts
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
```

**Step 4: Run test to verify it passes**

Run: `cd ~/Projects/kodiq/app && pnpm vitest run src/shared/lib/__tests__/analytics.test.ts`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
cd ~/Projects/kodiq/app
git add src/shared/lib/analytics.ts src/shared/lib/__tests__/analytics.test.ts
git commit -m "feat(analytics): create unified analytics module with tests"
```

---

### Task 3: Update `.env.example` and CSP

**Files:**
- Modify: `.env.example`
- Modify: `src-tauri/tauri.conf.json`

**Step 1: Add env vars to `.env.example`**

Append to `.env.example`:

```
# Sentry (error tracking)
VITE_SENTRY_DSN=

# PostHog (product analytics)
VITE_POSTHOG_KEY=
```

**Step 2: Add PostHog domains to CSP**

In `src-tauri/tauri.conf.json`, update the `csp` string's `connect-src` to add PostHog:

Before:
```
connect-src 'self' http://localhost:* ws://localhost:* https://*.ingest.sentry.io
```

After:
```
connect-src 'self' http://localhost:* ws://localhost:* https://*.ingest.sentry.io https://*.posthog.com https://*.i.posthog.com
```

**Step 3: Commit**

```bash
cd ~/Projects/kodiq/app
git add .env.example src-tauri/tauri.conf.json
git commit -m "feat(analytics): add PostHog env var and CSP entries"
```

---

### Task 4: Delete `sentry.ts`, update `errors.ts` import

**Files:**
- Delete: `src/shared/lib/sentry.ts`
- Modify: `src/shared/lib/errors.ts` (no changes needed — already imports `@sentry/browser` directly)
- Modify: `src/main.tsx`

**Step 1: Verify `errors.ts` is independent**

Read `src/shared/lib/errors.ts` — it imports `@sentry/browser` directly, NOT `sentry.ts`. No change needed.

**Step 2: Delete `sentry.ts`**

```bash
cd ~/Projects/kodiq/app
rm src/shared/lib/sentry.ts
```

**Step 3: Update `main.tsx` — replace `initSentry` with `initAnalytics`**

In `src/main.tsx`:

Remove:
```ts
import { initSentry } from "@/shared/lib/sentry";
```

Add:
```ts
import { initAnalytics, trackEvent } from "@/shared/lib/analytics";
```

Replace:
```ts
initSentry();
```
With:
```ts
initAnalytics();
```

**Step 4: Add `app_launched` event after `initAnalytics()`**

After `initAnalytics()` call:
```ts
trackEvent("app_launched", { version: __APP_VERSION__ });
```

**Step 5: Add `app_closed` event via `beforeunload`**

After the `trackEvent("app_launched"...)` line, add:
```ts
const appStartTime = Date.now();
window.addEventListener("beforeunload", () => {
  trackEvent("app_closed", {
    session_duration_s: Math.round((Date.now() - appStartTime) / 1000),
  });
});
```

**Step 6: Run typecheck to verify no broken imports**

Run: `cd ~/Projects/kodiq/app && pnpm run typecheck`
Expected: No errors (0 errors)

**Step 7: Commit**

```bash
cd ~/Projects/kodiq/app
git add -A
git commit -m "feat(analytics): wire initAnalytics in main.tsx, remove sentry.ts"
```

---

### Task 5: Add `project_opened` tracking

**Files:**
- Modify: `src/features/project/store/projectSlice.ts`

**Step 1: Add import at top of `projectSlice.ts`**

```ts
import { trackEvent } from "@shared/lib/analytics";
```

**Step 2: Add tracking call inside `setProject`**

Inside `setProject` (line 44), after `set({ projectPath: path, projectName: n })` on line 47, add:

```ts
trackEvent("project_opened");
```

Place it right after the `set(...)` call, before the `db.projects.getOrCreate(...)` block.

**Step 3: Run tests**

Run: `cd ~/Projects/kodiq/app && pnpm vitest run`
Expected: All tests pass (the store test doesn't test analytics — we mock it globally)

**Step 4: Commit**

```bash
cd ~/Projects/kodiq/app
git add src/features/project/store/projectSlice.ts
git commit -m "feat(analytics): track project_opened event"
```

---

### Task 6: Add `file_opened` tracking

**Files:**
- Modify: `src/features/editor/store/editorSlice.ts`

**Step 1: Add import**

```ts
import { trackEvent } from "@shared/lib/analytics";
```

**Step 2: Add tracking inside `openFile` (only for new tabs)**

Inside `openFile` (line 68), in the `else` branch that creates a new tab (line 80-94), after the `set(...)` call on line 88, add:

```ts
trackEvent("file_opened", { language: tab.language });
```

This fires only when a new tab is created, not when re-focusing an existing tab.

**Step 3: Run tests**

Run: `cd ~/Projects/kodiq/app && pnpm vitest run src/features/editor/store`
Expected: All editor tests pass

**Step 4: Commit**

```bash
cd ~/Projects/kodiq/app
git add src/features/editor/store/editorSlice.ts
git commit -m "feat(analytics): track file_opened with language"
```

---

### Task 7: Add `feature_used` tracking — terminal

**Files:**
- Modify: `src/features/terminal/store/terminalSlice.ts`

**Step 1: Add import**

```ts
import { trackEvent } from "@shared/lib/analytics";
```

**Step 2: Add tracking inside `addTab`**

Inside `addTab` (line 43), after `set(...)`, add:

```ts
trackEvent("feature_used", { feature: "terminal" });
```

Since `addTab` returns a `set()` call, wrap it:

Change from:
```ts
addTab: (tab) =>
  set((s) => ({
    tabs: [...s.tabs, tab],
    activeTab: tab.id,
  })),
```

To:
```ts
addTab: (tab) => {
  set((s) => ({
    tabs: [...s.tabs, tab],
    activeTab: tab.id,
  }));
  trackEvent("feature_used", { feature: "terminal" });
},
```

**Step 3: Run tests**

Run: `cd ~/Projects/kodiq/app && pnpm vitest run src/features/terminal/store`
Expected: All terminal tests pass

**Step 4: Commit**

```bash
cd ~/Projects/kodiq/app
git add src/features/terminal/store/terminalSlice.ts
git commit -m "feat(analytics): track feature_used for terminal"
```

---

### Task 8: Add `feature_used` tracking — editor, preview

**Files:**
- Modify: `src/features/editor/store/editorSlice.ts` (already has import from Task 6)
- Modify: `src/features/preview/store/previewSlice.ts`

**Step 1: Track editor in `openFile` (already done in Task 6)**

`file_opened` already fires in `openFile`. We also want `feature_used: editor` for first tab only.

Inside `openFile`, in the `else` branch (new tab), add alongside the existing `trackEvent("file_opened"...)`:

```ts
if (editorTabs.length === 0) {
  trackEvent("feature_used", { feature: "editor" });
}
```

This fires only when the first editor tab opens in a session (avoids noise from each file open).

**Step 2: Add tracking to `togglePreview`**

In `src/features/preview/store/previewSlice.ts`, add import:

```ts
import { trackEvent } from "@shared/lib/analytics";
```

Inside `togglePreview` (line 112), after `const next = !s.previewOpen`:

```ts
if (next) {
  trackEvent("feature_used", { feature: "preview" });
}
```

Only fires when preview opens, not when it closes.

**Step 3: Run all tests**

Run: `cd ~/Projects/kodiq/app && pnpm vitest run`
Expected: All tests pass

**Step 4: Commit**

```bash
cd ~/Projects/kodiq/app
git add src/features/editor/store/editorSlice.ts src/features/preview/store/previewSlice.ts
git commit -m "feat(analytics): track feature_used for editor and preview"
```

---

### Task 9: Add `feature_used` tracking — git panel

**Files:**
- Search for git panel toggle in UI components

**Step 1: Find where git panel opens**

The `gitSlice.ts` has no "open/toggle" action — it stores git state. The git panel visibility is likely toggled in a layout or sidebar component. Search for where the git panel UI is rendered/toggled.

Run: `grep -r "git" src/features/git/components/ --include="*.tsx" -l` or check sidebar/layout for git panel toggle.

**Step 2: Add tracking at the appropriate location**

Import `trackEvent` in the component that toggles git panel visibility and call:

```ts
trackEvent("feature_used", { feature: "git_panel" });
```

When the git panel is opened/activated.