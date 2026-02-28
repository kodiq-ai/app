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
  connectionId?: string;
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
export interface ChangedFile {
  file: string;
  status: string;
  kind: string;
}

export interface StagedFile {
  file: string;
  kind: string;
}

export interface GitInfo {
  isGit: boolean;
  branch?: string;
  commitHash?: string;
  commitMessage?: string;
  commitTime?: string;
  changedFiles?: ChangedFile[];
  changedCount?: number;
  stagedFiles?: StagedFile[];
  stagedCount?: number;
  unstagedFiles?: StagedFile[];
  unstagedCount?: number;
  ahead?: number;
  behind?: number;
}

export interface ProjectStats {
  totalFiles: number;
  totalDirs: number;
  totalSizeBytes: number;
  extensions: { ext: string; count: number }[];
  stack: string[];
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

// ── Preview ─────────────────────────────────────────────
export interface PreviewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ServerInfo {
  id: string;
  name: string;
  port: number | null;
  status: "starting" | "running" | "stopped";
  started_at: number;
}

export interface ServerLogEntry {
  timestamp: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface ServerConfig {
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface ServerReadyEvent {
  id: string;
  port: number;
  url: string;
}

export interface ServerLogEvent {
  id: string;
  entry: ServerLogEntry;
}

export interface ServerExitEvent {
  id: string;
}

// ── DevTools ─────────────────────────────────────────────
export type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";
export type DevToolsTab = "console" | "network" | "inspect";

export interface ConsoleEntry {
  id: string;
  level: ConsoleLevel;
  args: unknown[];
  timestamp: number;
  stack?: string;
}

export interface ConsoleEvent {
  level: string;
  args: unknown[];
  timestamp: number;
  stack?: string;
}

export type NetworkMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface NetworkEntry {
  id: string;
  method: string;
  url: string;
  status: number | null;
  statusText: string;
  type: "fetch" | "xhr";
  startTime: number;
  duration: number | null;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  responseSize: number | null;
  error: string | null;
}

export interface NetworkEvent {
  method: string;
  url: string;
  status: number | null;
  statusText: string;
  reqType: string;
  startTime: number;
  duration: number | null;
  responseSize: number | null;
  error: string | null;
}

export interface InspectResult {
  tagName: string;
  id: string | null;
  className: string | null;
  textContent: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  computedStyles: Record<string, string>;
}

export interface SnapshotNode {
  tag: string;
  role: string | null;
  text: string | null;
  id?: string;
  ariaLabel?: string;
  href?: string;
  src?: string;
  type?: string;
  name?: string;
  value?: string;
  children: SnapshotNode[];
}

// ── Chat ────────────────────────────────────────────────
export type ChatRole = "user" | "assistant";
export type ChatProvider = "claude" | "gemini" | "codex";

export interface ChatMessage {
  id: string;
  project_id: string;
  role: ChatRole;
  content: string;
  provider: ChatProvider;
  created_at: number;
}

export interface NewChatMessage {
  id: string;
  project_id: string;
  role: ChatRole;
  content: string;
  provider: ChatProvider;
}

export interface ChatChunkEvent {
  provider: string;
  content: string;
}

export interface ChatDoneEvent {
  provider: string;
}

// ── UI Types ─────────────────────────────────────────────
export type ColorScheme = "light" | "dark";
export type Viewport = "desktop" | "tablet" | "mobile";
export type SidebarTab = "files" | "project" | "activity" | "git" | "ssh" | "chat";

// ── Update ───────────────────────────────────────────────
export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body: string | null;
  date: string | null;
}

// ── SSH ─────────────────────────────────────────────────
export type SshAuthMethod = "key" | "password" | "agent";
export type SshConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

export interface SshConnectionConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: SshAuthMethod;
  privateKeyPath?: string;
}

export interface SshActiveConnection {
  id: string;
  config: SshConnectionConfig;
  status: SshConnectionStatus;
  remoteHome?: string;
  connectedAt?: number;
}

export interface SavedSshConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: string;
  privateKeyPath?: string;
  createdAt: number;
  updatedAt: number;
  lastConnected?: number;
  connectCount: number;
}

export interface SshPortForward {
  id: string;
  connectionId: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  autoStart: boolean;
  createdAt: number;
}

export interface NewPortForward {
  connectionId: string;
  localPort: number;
  remoteHost?: string;
  remotePort: number;
  autoStart?: boolean;
}

export interface ActiveForward {
  id: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
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
