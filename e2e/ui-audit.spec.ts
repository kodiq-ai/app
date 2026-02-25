// ── E2E: UI Audit ───────────────────────────────────────────────────────────
// Takes screenshots of key UI states for visual inspection.
/* eslint-disable no-console */

import { test } from "@playwright/test";
import { injectTauriMocks } from "./tauri-mocks";

const PROJECT_MOCKS = {
  db_get_all_settings: {
    onboardingComplete: "true",
    fontSize: "14",
    fontFamily: "Monaspace Neon",
  },
  db_list_projects: [
    { id: "p1", name: "kodiq-app", path: "/tmp/kodiq-app", lastOpened: Date.now() },
  ],
  db_get_or_create_project: {
    id: "p1",
    name: "kodiq-app",
    path: "/tmp/kodiq-app",
  },
  read_dir: [
    { name: "src", path: "/tmp/kodiq-app/src", isDir: true, children: null },
    { name: "package.json", path: "/tmp/kodiq-app/package.json", isDir: false, children: null },
    { name: "tsconfig.json", path: "/tmp/kodiq-app/tsconfig.json", isDir: false, children: null },
    { name: "README.md", path: "/tmp/kodiq-app/README.md", isDir: false, children: null },
    { name: ".gitignore", path: "/tmp/kodiq-app/.gitignore", isDir: false, children: null },
  ],
};

test.describe("UI Audit - Empty State", () => {
  test("empty state screenshot + console errors", async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
      if (msg.type() === "warning") warnings.push(msg.text());
    });

    await injectTauriMocks(page);
    await page.goto("/");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-results/audit-empty-state.png", fullPage: true });

    // Log console errors (filtered)
    const realErrors = errors.filter(
      (e) =>
        !e.includes("__TAURI") &&
        !e.includes("tauri") &&
        !e.includes("invoke") &&
        !e.includes("favicon"),
    );
    console.log("=== EMPTY STATE ERRORS ===");
    console.log(JSON.stringify(realErrors, null, 2));
    console.log("=== EMPTY STATE WARNINGS ===");
    console.log(JSON.stringify(warnings.slice(0, 10), null, 2));
  });
});

test.describe("UI Audit - With Project", () => {
  test("project view screenshot + console errors", async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
      if (msg.type() === "warning") warnings.push(msg.text());
    });

    await injectTauriMocks(page, PROJECT_MOCKS);
    await page.goto("/");
    await page.waitForTimeout(2500);
    await page.screenshot({ path: "test-results/audit-project-view.png", fullPage: true });

    console.log("=== PROJECT VIEW ERRORS ===");
    const realErrors = errors.filter(
      (e) =>
        !e.includes("__TAURI") &&
        !e.includes("tauri") &&
        !e.includes("invoke") &&
        !e.includes("favicon"),
    );
    console.log(JSON.stringify(realErrors, null, 2));
  });

  test("command palette screenshot", async ({ page }) => {
    await injectTauriMocks(page, PROJECT_MOCKS);
    await page.goto("/");
    await page.waitForTimeout(1500);
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/audit-command-palette.png", fullPage: true });
  });

  test("settings dialog screenshot", async ({ page }) => {
    await injectTauriMocks(page, PROJECT_MOCKS);
    await page.goto("/");
    await page.waitForTimeout(1500);
    await page.keyboard.press("Control+,");
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/audit-settings.png", fullPage: true });
  });

  test("sidebar panels - all tabs", async ({ page }) => {
    await injectTauriMocks(page, PROJECT_MOCKS);
    await page.goto("/");
    await page.waitForTimeout(2000);

    // Screenshot current state
    await page.screenshot({ path: "test-results/audit-sidebar-default.png", fullPage: true });

    // Try clicking each activity bar button
    const buttons = page.locator("button").filter({ hasText: /./ });
    const count = await buttons.count();
    console.log(`=== ACTIVITY BAR BUTTONS: ${count} ===`);
  });
});
