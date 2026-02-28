// ── Tauri IPC Mocks for E2E ──────────────────────────────────────────────────
// Intercepts window.__TAURI_INTERNALS__ to mock IPC calls in browser context.
// Each test can override specific commands via page.evaluate().

import type { Page } from "@playwright/test";

/** Default mock responses for Tauri IPC commands */
const DEFAULT_MOCKS: Record<string, unknown> = {
  // Terminal
  spawn_terminal: "mock-term-1",
  write_to_pty: undefined,
  resize_pty: undefined,
  close_terminal: undefined,

  // Filesystem
  read_dir: [],
  read_file: "",
  write_file: undefined,
  start_watching: undefined,
  stop_watching: undefined,

  // Git
  get_git_info: {
    branch: "main",
    remote: "origin",
    hasChanges: false,
    staged: [],
    unstaged: [],
    untracked: [],
  },
  get_project_stats: { totalFiles: 42, totalLines: 1337, languages: {} },
  git_stage: undefined,
  git_unstage: undefined,
  git_stage_all: undefined,
  git_unstage_all: undefined,
  git_commit: { hash: "abc1234", message: "test commit" },
  git_diff: "",

  // CLI
  detect_cli_tools: [
    { name: "node", version: "22.0.0", path: "/usr/local/bin/node" },
    { name: "git", version: "2.45.0", path: "/usr/bin/git" },
  ],
  detect_default_shell: "/bin/zsh",

  // Database — Projects
  db_list_projects: [],
  db_create_project: { id: "proj-1", name: "Test Project", path: "/tmp/test" },
  db_touch_project: undefined,
  db_update_project: undefined,
  db_get_or_create_project: { id: "proj-1", name: "Test Project", path: "/tmp/test" },

  // Database — Settings
  db_get_setting: null,
  db_set_setting: undefined,
  db_get_all_settings: {},

  // Database — Sessions
  db_list_sessions: [],
  db_save_session: undefined,
  db_close_session: undefined,
  db_close_all_sessions: undefined,

  // Database — History
  db_search_history: [],
  db_recent_history: [],
  db_add_history: undefined,

  // Database — Snippets
  db_list_snippets: [],
  db_create_snippet: { id: "snip-1", name: "test", command: "echo hi" },
  db_use_snippet: { id: "snip-1", name: "test", command: "echo hi" },

  // Database — Launch Configs
  db_list_launch_configs: [],
  db_create_launch_config: { id: "lc-1", name: "dev", command: "pnpm dev" },
  db_update_launch_config: undefined,
  db_delete_launch_config: undefined,

  // Chat
  chat_send: undefined,
  chat_stop: undefined,
  db_list_chat_messages: [],
  db_save_chat_message: {
    id: "chat-1",
    project_id: "p1",
    role: "user",
    content: "test",
    provider: "claude",
    created_at: Date.now(),
  },
  db_clear_chat: 0,

  // SSH
  ssh_connect: { id: "conn-1", host: "localhost", status: "connected" },
  ssh_disconnect: undefined,
  ssh_list_connections: [],
  ssh_test_connection: true,
  ssh_connection_status: { id: "conn-1", status: "connected" },
  ssh_spawn_terminal: "ssh-term-1",
  ssh_write: undefined,
  ssh_resize: undefined,
  ssh_close_terminal: undefined,
  ssh_start_forward: "fwd-1",
  ssh_stop_forward: undefined,
  ssh_list_forwards: [],
  ssh_list_saved_connections: [],
  ssh_save_connection: { id: "saved-1", host: "example.com" },
  ssh_delete_connection: undefined,
  ssh_list_port_forwards: [],
  ssh_save_port_forward: { id: "pf-1" },
  ssh_delete_port_forward: undefined,
};

/**
 * Inject Tauri IPC mocks into the page before app loads.
 * Call this in test.beforeEach() or a fixture.
 */
export async function injectTauriMocks(page: Page, overrides: Record<string, unknown> = {}) {
  const mocks = { ...DEFAULT_MOCKS, ...overrides };

  await page.addInitScript((mocksJson) => {
    const mockResponses = JSON.parse(mocksJson) as Record<string, unknown>;

    // Track IPC calls for assertions
    (window as Record<string, unknown>).__TAURI_IPC_LOG__ = [] as Array<{
      cmd: string;
      args: unknown;
    }>;

    // Mock Tauri internals — this is what @tauri-apps/api/core reads
    (window as Record<string, unknown>).__TAURI_INTERNALS__ = {
      transformCallback: (_callback: (payload: unknown) => void) => {
        const id = Math.random();
        (window as Record<string, number>)[`_${id}`] = id;
        return id;
      },
      convertFileSrc: (path: string) => `asset://localhost/${path}`,
      metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main" } },
      invoke: (cmd: string, args?: Record<string, unknown>) => {
        const log = (window as Record<string, unknown>).__TAURI_IPC_LOG__ as Array<{
          cmd: string;
          args: unknown;
        }>;
        log.push({ cmd, args });

        if (cmd in mockResponses) {
          const response = mockResponses[cmd];
          return Promise.resolve(typeof response === "function" ? response(args) : response);
        }

        console.warn(`[tauri-mock] Unhandled IPC command: ${cmd}`, args);
        return Promise.resolve(null);
      },
    };

    // Mock event listeners (pty-output, fs-change, etc.)
    (window as Record<string, unknown>).__TAURI_EVENT_LISTENERS__ = new Map();
  }, JSON.stringify(mocks));
}

/**
 * Get the IPC call log from the page — useful for asserting commands were called.
 */
export function getIpcLog(page: Page) {
  return page.evaluate(
    () =>
      (window as Record<string, unknown>).__TAURI_IPC_LOG__ as Array<{
        cmd: string;
        args: unknown;
      }>,
  );
}

/**
 * Override a specific IPC command response at runtime.
 */
export async function mockIpcCommand(page: Page, cmd: string, response: unknown) {
  await page.evaluate(
    ({ cmd, response }) => {
      const internals = (window as Record<string, unknown>).__TAURI_INTERNALS__ as {
        _mockResponses?: Record<string, unknown>;
      };
      if (!internals._mockResponses) internals._mockResponses = {};
      internals._mockResponses[cmd] = response;
    },
    { cmd, response },
  );
}
