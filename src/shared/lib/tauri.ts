// ── Typed Tauri Bridge ────────────────────────────────────────────────────────
// All Rust↔JS communication goes through this module.
// No raw invoke() calls elsewhere in the codebase.

import { invoke } from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";
import type { EventCallback, UnlistenFn } from "@tauri-apps/api/event";

/** True when running inside the Tauri webview (not a regular browser). */
export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Safe wrapper around Tauri `listen()` — returns a no-op unlisten in browser.
 * Prevents "Cannot read properties of undefined (reading 'transformCallback')" crashes.
 */
export function listen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
  if (!isTauri) return Promise.resolve(() => {});
  return tauriListen(event, handler);
}
import type {
  FileEntry,
  GitInfo,
  ProjectStats,
  CliTool,
  Project,
  TerminalSession,
  NewSession,
  HistoryEntry,
  NewHistoryEntry,
  Snippet,
  NewSnippet,
  LaunchConfig,
  NewLaunchConfig,
  UpdateLaunchConfig,
  PreviewBounds,
  ServerInfo,
  ServerLogEntry,
  ServerConfig,
  InspectResult,
  SnapshotNode,
  SshConnectionConfig,
  SshActiveConnection,
  SavedSshConnection,
  SshPortForward,
  NewPortForward,
  ActiveForward,
  ChatMessage,
  NewChatMessage,
} from "./types";

// -- Helpers ─────────────────────────────────────────────

/**
 * One-shot Tauri event listener with timeout.
 * Sets up listener BEFORE trigger to avoid race conditions.
 */
function listenOnce<T>(
  eventName: string,
  timeoutMs: number,
  trigger: () => Promise<void>,
): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    let done = false;
    let unlistenRef: (() => void) | null = null;

    const finish = (val: T | null) => {
      if (done) return;
      done = true;
      unlistenRef?.();
      resolve(val);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    void tauriListen<T | null>(eventName, (event) => {
      clearTimeout(timer);
      finish(event.payload);
    }).then(
      (unlisten) => {
        unlistenRef = unlisten;
        // If finish() was already called (e.g. trigger failed), clean up immediately
        if (done) unlisten();
        void trigger().catch(() => {
          clearTimeout(timer);
          finish(null);
        });
      },
      () => {
        clearTimeout(timer);
        finish(null);
      },
    );
  });
}

// ── Terminal ─────────────────────────────────────────────
export const terminal = {
  spawn: (opts: {
    command?: string | null;
    cwd?: string | null;
    shell?: string | null;
    env?: Record<string, string> | null;
  }) => invoke<string>("spawn_terminal", opts),
  write: (id: string, data: string) => invoke<void>("write_to_pty", { id, data }),
  resize: (id: string, cols: number, rows: number) =>
    invoke<void>("resize_pty", { id, cols, rows }),
  close: (id: string) => invoke<void>("close_terminal", { id }),
};

// ── Filesystem ───────────────────────────────────────────
export const fs = {
  readDir: (path: string, connectionId?: string | null) =>
    invoke<FileEntry[]>("read_dir", { path, connectionId: connectionId ?? null }),
  readFile: (path: string, connectionId?: string | null) =>
    invoke<string>("read_file", { path, connectionId: connectionId ?? null }),
  writeFile: (path: string, content: string, connectionId?: string | null) =>
    invoke<void>("write_file", { path, content, connectionId: connectionId ?? null }),
  startWatching: (path: string) => invoke<void>("start_watching", { path }),
  stopWatching: () => invoke<void>("stop_watching"),
};

// ── Git ──────────────────────────────────────────────────
export const git = {
  getInfo: (path: string, connectionId?: string | null) =>
    invoke<GitInfo>("get_git_info", { path, connectionId: connectionId ?? null }),
  getStats: (path: string, connectionId?: string | null) =>
    invoke<ProjectStats>("get_project_stats", { path, connectionId: connectionId ?? null }),
  stage: (path: string, files: string[], connectionId?: string | null) =>
    invoke<void>("git_stage", { path, files, connectionId: connectionId ?? null }),
  unstage: (path: string, files: string[], connectionId?: string | null) =>
    invoke<void>("git_unstage", { path, files, connectionId: connectionId ?? null }),
  stageAll: (path: string, connectionId?: string | null) =>
    invoke<void>("git_stage_all", { path, connectionId: connectionId ?? null }),
  unstageAll: (path: string, connectionId?: string | null) =>
    invoke<void>("git_unstage_all", { path, connectionId: connectionId ?? null }),
  commit: (path: string, message: string, connectionId?: string | null) =>
    invoke<{ hash: string; message: string }>("git_commit", {
      path,
      message,
      connectionId: connectionId ?? null,
    }),
  diff: (path: string, file: string, staged: boolean, connectionId?: string | null) =>
    invoke<string>("git_diff", { path, file, staged, connectionId: connectionId ?? null }),
};

// ── Preview — Webview ────────────────────────────────────
export const preview = {
  navigate: (url: string, bounds: PreviewBounds) =>
    invoke<void>("preview_navigate", { url, bounds }),
  resize: (bounds: PreviewBounds) => invoke<void>("preview_resize", { bounds }),
  reload: () => invoke<void>("preview_reload"),
  executeJs: (expression: string) => invoke<void>("preview_execute_js", { expression }),

  // ── Interaction ─────────────────────────────────────────
  click: (selector: string) => invoke<void>("preview_click", { selector }),
  fill: (selector: string, value: string) => invoke<void>("preview_fill", { selector, value }),
  hover: (selector: string) => invoke<void>("preview_hover", { selector }),

  // ── Inspection ──────────────────────────────────────────
  inspect: (selector: string) =>
    listenOnce<InspectResult>("preview://inspect-result", 5000, () =>
      invoke<void>("preview_inspect", { selector }),
    ),
  snapshot: () =>
    listenOnce<SnapshotNode>("preview://snapshot-result", 5000, () =>
      invoke<void>("preview_snapshot"),
    ),

  // ── Color scheme & screenshot ──────────────────────────
  setColorScheme: (scheme: string) => invoke<void>("preview_set_color_scheme", { scheme }),
  screenshot: () =>
    listenOnce<string | null>("preview://screenshot-result", 10000, () =>
      invoke<void>("preview_screenshot"),
    ),

  destroy: () => invoke<void>("preview_destroy"),

  // ── Preview — Server ────────────────────────────────────
  startServer: (config: ServerConfig) => invoke<string>("preview_start_server", { config }),
  stopServer: (id: string) => invoke<void>("preview_stop_server", { id }),
  listServers: () => invoke<ServerInfo[]>("preview_list_servers"),
  serverLogs: (id: string, level?: string, search?: string) =>
    invoke<ServerLogEntry[]>("preview_server_logs", {
      id,
      level: level ?? null,
      search: search ?? null,
    }),
};

// ── CLI ──────────────────────────────────────────────────
export const cli = {
  detectTools: () => invoke<CliTool[]>("detect_cli_tools"),
  detectShell: () => invoke<string>("detect_default_shell"),
};

// ── Database — Projects ──────────────────────────────────
export const db = {
  projects: {
    list: () => invoke<Project[]>("db_list_projects"),
    create: (name: string, path: string) => invoke<Project>("db_create_project", { name, path }),
    touch: (path: string) => invoke<void>("db_touch_project", { path }),
    update: (
      id: string,
      patch: { name?: string; default_cli?: string | null; settings?: string | null },
    ) => invoke<void>("db_update_project", { id, patch }),
    getOrCreate: (name: string, path: string) =>
      invoke<Project>("db_get_or_create_project", { name, path }),
  },

  // ── Database — Settings ──────────────────────────────────
  settings: {
    get: (key: string) => invoke<string | null>("db_get_setting", { key }),
    set: (key: string, value: string) => invoke<void>("db_set_setting", { key, value }),
    getAll: () => invoke<Record<string, string>>("db_get_all_settings"),
  },

  // ── Database — Sessions ──────────────────────────────────
  sessions: {
    list: (projectId: string) => invoke<TerminalSession[]>("db_list_sessions", { projectId }),
    save: (session: NewSession) => invoke<void>("db_save_session", { session }),
    close: (id: string) => invoke<void>("db_close_session", { id }),
    closeAll: (projectId: string) => invoke<void>("db_close_all_sessions", { projectId }),
  },

  // ── Database — History ───────────────────────────────────
  history: {
    search: (query: string, projectId?: string | null) =>
      invoke<HistoryEntry[]>("db_search_history", { query, projectId: projectId ?? null }),
    recent: (projectId?: string | null, limit?: number) =>
      invoke<HistoryEntry[]>("db_recent_history", {
        projectId: projectId ?? null,
        limit: limit ?? 20,
      }),
    add: (entry: NewHistoryEntry) => invoke<void>("db_add_history", { entry }),
  },

  // ── Database — Snippets ──────────────────────────────────
  snippets: {
    list: (cliName?: string | null) =>
      invoke<Snippet[]>("db_list_snippets", { cliName: cliName ?? null }),
    create: (snippet: NewSnippet) => invoke<Snippet>("db_create_snippet", { snippet }),
    use: (id: string) => invoke<Snippet>("db_use_snippet", { id }),
  },

  // ── Database — Launch Configs ─────────────────────────────
  launchConfigs: {
    list: (projectId?: string | null) =>
      invoke<LaunchConfig[]>("db_list_launch_configs", { projectId: projectId ?? null }),
    create: (config: NewLaunchConfig) =>
      invoke<LaunchConfig>("db_create_launch_config", { config }),
    update: (id: string, patch: UpdateLaunchConfig) =>
      invoke<void>("db_update_launch_config", { id, patch }),
    delete: (id: string) => invoke<void>("db_delete_launch_config", { id }),
  },
};

// ── Chat ────────────────────────────────────────────────
export const chat = {
  send: (provider: string, prompt: string, cwd?: string | null) =>
    invoke<void>("chat_send", { provider, prompt, cwd: cwd ?? null }),
  stop: () => invoke<void>("chat_stop"),
  loadHistory: (projectId: string, limit?: number) =>
    invoke<ChatMessage[]>("db_list_chat_messages", { projectId, limit: limit ?? 200 }),
  saveMessage: (message: NewChatMessage) =>
    invoke<ChatMessage>("db_save_chat_message", { message }),
  clearHistory: (projectId: string) => invoke<number>("db_clear_chat", { projectId }),
};

// ── SSH ─────────────────────────────────────────────────
export const ssh = {
  // Connection management
  connect: (config: SshConnectionConfig, password?: string | null) =>
    invoke<SshActiveConnection>("ssh_connect", { config, password: password ?? null }),
  disconnect: (connectionId: string) => invoke<void>("ssh_disconnect", { connectionId }),
  listConnections: () => invoke<SshActiveConnection[]>("ssh_list_connections"),
  testConnection: (config: SshConnectionConfig, password?: string | null) =>
    invoke<boolean>("ssh_test_connection", { config, password: password ?? null }),
  connectionStatus: (connectionId: string) =>
    invoke<SshActiveConnection>("ssh_connection_status", { connectionId }),

  // Terminal (remote PTY)
  spawnTerminal: (connectionId: string, cols?: number, rows?: number) =>
    invoke<string>("ssh_spawn_terminal", { connectionId, cols: cols ?? null, rows: rows ?? null }),
  write: (id: string, data: string) => invoke<void>("ssh_write", { id, data }),
  resize: (id: string, cols: number, rows: number) =>
    invoke<void>("ssh_resize", { id, cols, rows }),
  closeTerminal: (id: string) => invoke<void>("ssh_close_terminal", { id }),

  // Port forwarding
  startForward: (
    connectionId: string,
    localPort: number,
    remotePort: number,
    remoteHost?: string,
  ) =>
    invoke<string>("ssh_start_forward", {
      connectionId,
      localPort,
      remoteHost: remoteHost ?? null,
      remotePort,
    }),
  stopForward: (forwardId: string) => invoke<void>("ssh_stop_forward", { forwardId }),
  listForwards: () => invoke<ActiveForward[]>("ssh_list_forwards"),

  // Saved connections (DB)
  savedConnections: {
    list: () => invoke<SavedSshConnection[]>("ssh_list_saved_connections"),
    save: (config: SshConnectionConfig) =>
      invoke<SavedSshConnection>("ssh_save_connection", { config }),
    delete: (id: string) => invoke<void>("ssh_delete_connection", { id }),
  },

  // Port forward rules (DB)
  portForwards: {
    list: (connectionId: string) =>
      invoke<SshPortForward[]>("ssh_list_port_forwards", { connectionId }),
    save: (forward: NewPortForward) => invoke<SshPortForward>("ssh_save_port_forward", { forward }),
    delete: (id: string) => invoke<void>("ssh_delete_port_forward", { id }),
  },
};
