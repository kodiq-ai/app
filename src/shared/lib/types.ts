// ── Shared Types ──────────────────────────────────────────────────────────────
// All types used across features live here.
// These mirror the Rust structs from src-tauri/src/.

// ── Project ──────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  path: string;
  created_at: number;
  last_opened: number;
  open_count: number;
  default_cli: string | null;
  settings: string | null; // JSON string
}

// ── Terminal ─────────────────────────────────────────────
export interface TerminalTab {
  id: string;
  label: string;
  command?: string;
}

export interface TerminalSession {
  id: string;
  project_id: string;
  label: string;
  command: string | null;
  cwd: string | null;
  sort_order: number;
  created_at: number;
  closed_at: number | null;
  is_active: boolean;
}

export interface NewSession {
  id: string;
  project_id: string;
  label: string;
  command: string | null;
  cwd: string | null;
  sort_order: number;
}

// ── Filesystem ───────────────────────────────────────────
export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileEntry[];
}

// ── Git ──────────────────────────────────────────────────
export interface GitInfo {
  branch: string | null;
  commit_hash: string | null;
  commit_message: string | null;
  is_dirty: boolean;
  ahead: number;
  behind: number;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
}

export interface ProjectStats {
  total_files: number;
  total_dirs: number;
  total_size: number;
  extensions: Record<string, number>;
  detected_stack: string[];
}

// ── CLI ──────────────────────────────────────────────────
export interface CliTool {
  bin: string;
  name: string;
  provider: string;
  version: string;
  installed: boolean;
}

// ── Settings ─────────────────────────────────────────────
export interface AppSettings {
  shell: string;
  fontSize: number;
  fontFamily: string;
  locale: "en" | "ru";
  splitRatio: number;
  sidebarOpen: boolean;
  previewOpen: boolean;
  autoOpenPreview: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  shell: "",
  fontSize: 13,
  fontFamily: "'Monaspace Neon', 'SF Mono', 'Menlo', 'Consolas', monospace",
  locale: "en",
  splitRatio: 0.5,
  sidebarOpen: true,
  previewOpen: true,
  autoOpenPreview: true,
};

// ── Launch Configs ──────────────────────────────────────
export interface LaunchConfig {
  id: string;
  cli_name: string;
  profile_name: string;
  config: string; // JSON string: LaunchConfigPayload
  is_default: boolean;
  project_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface LaunchConfigPayload {
  args: string[];
  env: Record<string, string>;
  cwd: string | null;
  shell: string | null;
}

export interface NewLaunchConfig {
  cli_name: string;
  profile_name: string;
  config: string;
  is_default?: boolean;
  project_id?: string | null;
}

export interface UpdateLaunchConfig {
  profile_name?: string;
  config?: string;
  is_default?: boolean;
}

// ── History ──────────────────────────────────────────────
export interface HistoryEntry {
  id: number;
  project_id: string;
  session_id: string | null;
  command: string;
  cli_name: string | null;
  exit_code: number | null;
  duration_ms: number | null;
  timestamp: number;
}

export interface NewHistoryEntry {
  project_id: string;
  session_id: string | null;
  command: string;
  cli_name: string | null;
}

// ── Snippets ─────────────────────────────────────────────
export interface Snippet {
  id: string;
  title: string;
  content: string;
  cli_name: string | null;
  tags: string;
  usage_count: number;
  created_at: number;
  updated_at: number;
}

export interface NewSnippet {
  title: string;
  content: string;
  cli_name: string | null;
  tags: string | null;
}

// ── Recent Projects (in-memory) ──────────────────────────
export interface RecentProject {
  name: string;
  path: string;
}

// ── Saved Tabs (session restore) ─────────────────────────
export interface SavedTab {
  label: string;
  command?: string;
}

// ── UI Types ─────────────────────────────────────────────
export type Viewport = "desktop" | "tablet" | "mobile";
export type SidebarTab = "files" | "project" | "activity";

// ── Update ───────────────────────────────────────────────
export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body: string | null;
  date: string | null;
}

// ── Events (from Rust) ──────────────────────────────────
export interface PtyOutputEvent {
  id: string;
  data: string;
}

export interface PtyExitEvent {
  id: string;
}

export interface PortDetectedEvent {
  id: string;
  port: number;
  url: string;
}
