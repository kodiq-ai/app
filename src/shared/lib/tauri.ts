// ── Typed Tauri Bridge ────────────────────────────────────────────────────────
// All Rust↔JS communication goes through this module.
// No raw invoke() calls elsewhere in the codebase.

import { invoke } from "@tauri-apps/api/core";
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
} from "./types";

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
  readDir: (path: string) => invoke<FileEntry[]>("read_dir", { path }),
  readFile: (path: string) => invoke<string>("read_file", { path }),
  writeFile: (path: string, content: string) => invoke<void>("write_file", { path, content }),
  startWatching: (path: string) => invoke<void>("start_watching", { path }),
  stopWatching: () => invoke<void>("stop_watching"),
};

// ── Git ──────────────────────────────────────────────────
export const git = {
  getInfo: (path: string) => invoke<GitInfo>("get_git_info", { path }),
  getStats: (path: string) => invoke<ProjectStats>("get_project_stats", { path }),
  stage: (path: string, files: string[]) => invoke<void>("git_stage", { path, files }),
  unstage: (path: string, files: string[]) => invoke<void>("git_unstage", { path, files }),
  stageAll: (path: string) => invoke<void>("git_stage_all", { path }),
  unstageAll: (path: string) => invoke<void>("git_unstage_all", { path }),
  commit: (path: string, message: string) =>
    invoke<{ hash: string; message: string }>("git_commit", { path, message }),
  diff: (path: string, file: string, staged: boolean) =>
    invoke<string>("git_diff", { path, file, staged }),
};

// ── Preview — Webview ────────────────────────────────────
export const preview = {
  navigate: (url: string, bounds: PreviewBounds) =>
    invoke<void>("preview_navigate", { url, bounds }),
  resize: (bounds: PreviewBounds) => invoke<void>("preview_resize", { bounds }),
  reload: () => invoke<void>("preview_reload"),
  executeJs: (expression: string) => invoke<void>("preview_execute_js", { expression }),
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
