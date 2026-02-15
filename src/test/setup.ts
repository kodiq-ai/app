// ── Test Setup ───────────────────────────────────────────────────────────────
// Global mocks for Vitest + Testing Library

import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Tauri core APIs
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({}));
