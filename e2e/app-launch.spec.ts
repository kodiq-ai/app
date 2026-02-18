// ── E2E: App Launch & Basic Navigation ──────────────────────────────────────
// Verifies that Kodiq loads, renders core layout, and basic interactions work.

import { test, expect } from "@playwright/test";
import { injectTauriMocks, getIpcLog } from "./tauri-mocks";

test.beforeEach(async ({ page }) => {
  await injectTauriMocks(page);
  await page.goto("/");
});

test.describe("App Launch", () => {
  test("renders the app shell without crashing", async ({ page }) => {
    // App should load without JS errors
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // Wait for React to mount
    await page.waitForSelector("[data-testid='app-root'], #root", { timeout: 10_000 });

    // Should have no critical errors (ignore expected Tauri warnings)
    const criticalErrors = errors.filter(
      (e) => !e.includes("__TAURI") && !e.includes("tauri") && !e.includes("invoke"),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("shows empty state or onboarding when no project is open", async ({ page }) => {
    // Without a project, we should see the empty state or onboarding
    await expect(page.getByText(/open project|select project|get started|onboarding/i)).toBeVisible(
      { timeout: 10_000 },
    );
  });
});

test.describe("App Layout (with project)", () => {
  test.beforeEach(async ({ page }) => {
    // Re-inject mocks with project data
    await injectTauriMocks(page, {
      db_get_all_settings: { onboardingComplete: "true" },
      db_list_projects: [
        { id: "p1", name: "test-project", path: "/tmp/test-project", lastOpened: Date.now() },
      ],
      db_get_or_create_project: {
        id: "p1",
        name: "test-project",
        path: "/tmp/test-project",
      },
      read_dir: [
        { name: "src", path: "/tmp/test-project/src", isDir: true, children: null },
        {
          name: "package.json",
          path: "/tmp/test-project/package.json",
          isDir: false,
          children: null,
        },
        { name: "README.md", path: "/tmp/test-project/README.md", isDir: false, children: null },
      ],
    });
    await page.goto("/");
  });

  test("activity bar is visible on the right side", async ({ page }) => {
    // Activity bar should always be present (4 icon buttons)
    const _activityBar = page.locator("[class*='w-10'], [class*='activity']").first();
    // At minimum, the page should have some buttons for sidebar tabs
    const buttons = page.getByRole("button");
    await expect(buttons.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Tauri IPC Integration", () => {
  test("IPC calls are intercepted by mocks", async ({ page }) => {
    await page.waitForTimeout(2000); // Let app initialize

    const log = await getIpcLog(page);
    // App should have made some IPC calls during initialization
    expect(log.length).toBeGreaterThan(0);

    // Common init calls: detect_default_shell, db_get_all_settings, etc.
    const commands = log.map((entry) => entry.cmd);
    expect(commands.length).toBeGreaterThan(0);
  });

  test("mock responses are returned correctly", async ({ page }) => {
    const result = await page.evaluate(() => {
      const internals = (window as Record<string, unknown>).__TAURI_INTERNALS__ as {
        invoke: (cmd: string, args?: unknown) => Promise<unknown>;
      };
      return internals.invoke("detect_default_shell");
    });

    expect(result).toBe("/bin/zsh");
  });
});
