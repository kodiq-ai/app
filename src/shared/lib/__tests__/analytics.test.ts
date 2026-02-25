import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type * as SentryTypes from "@sentry/browser";
import type posthogType from "posthog-js";

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

const STORAGE_KEY = "kodiq:telemetry-opt-out";

// -- Manual localStorage mock (survives vi.resetModules) -------

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

describe("analytics", () => {
  let Sentry: typeof SentryTypes;
  let posthog: typeof posthogType;
  let initAnalytics: () => void;
  let trackEvent: (name: string, props?: Record<string, unknown>) => void;
  let identifyUser: (id: string, traits?: Record<string, unknown>) => void;
  let setOptOut: (value: boolean) => void;
  let isOptedOut: () => boolean;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module state so `initialized` resets between tests
    vi.resetModules();

    // Install fresh localStorage mock AFTER resetModules (jsdom's gets destroyed)
    Object.defineProperty(globalThis, "localStorage", {
      value: createLocalStorageMock(),
      writable: true,
      configurable: true,
    });

    // Vite `define` globals not available in test — stub manually
    vi.stubGlobal("__APP_VERSION__", "0.0.0-test");

    vi.stubEnv("VITE_SENTRY_DSN", "https://fake@sentry.io/123");
    vi.stubEnv("VITE_POSTHOG_KEY", "phc_fake_key");

    // Dynamic import to get fresh module each time
    Sentry = await import("@sentry/browser");
    const ph = await import("posthog-js");
    posthog = ph.default;
    const analytics = await import("../analytics");
    initAnalytics = analytics.initAnalytics;
    trackEvent = analytics.trackEvent;
    identifyUser = analytics.identifyUser;
    setOptOut = analytics.setOptOut;
    isOptedOut = analytics.isOptedOut;
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
