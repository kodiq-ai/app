import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FileEntry { name: string; path: string; isDir: boolean }
interface CliTool { bin: string; name: string; provider: string; installed: boolean; version: string }
interface Tab { id: string; label: string; command: string }
type Viewport = "desktop" | "tablet" | "mobile";

// ─── Terminal hooks ──────────────────────────────────────────────────────────

function useTerminal(terminalId: string | null) {
  const write = useCallback((data: string) => {
    if (!terminalId) return;
    invoke("write_to_pty", { id: terminalId, data }).catch(() => {});
  }, [terminalId]);

  const onData = useCallback((callback: (data: string) => void) => {
    if (!terminalId) return () => {};
    let unlisten: UnlistenFn | null = null;
    listen<{ id: string; data: string }>("pty-output", (event) => {
      if (event.payload.id === terminalId) callback(event.payload.data);
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [terminalId]);

  const onExit = useCallback((callback: () => void) => {
    if (!terminalId) return () => {};
    let unlisten: UnlistenFn | null = null;
    listen<{ id: string }>("pty-exit", (event) => {
      if (event.payload.id === terminalId) callback();
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [terminalId]);

  const resize = useCallback((cols: number, rows: number) => {
    if (!terminalId) return;
    invoke("resize_pty", { id: terminalId, cols, rows }).catch(() => {});
  }, [terminalId]);

  return { write, onData, onExit, resize };
}

async function spawnTerminal(command?: string, cwd?: string): Promise<string> {
  return invoke<string>("spawn_terminal", { command: command || null, cwd: cwd || null });
}

async function closeTerminalPty(id: string): Promise<void> {
  return invoke("close_terminal", { id });
}

async function detectCliTools(): Promise<CliTool[]> {
  return invoke<CliTool[]>("detect_cli_tools");
}

// ─── Constants ───────────────────────────────────────────────────────────────

const XTERM_THEME = {
  background: "#0a0a0c", foreground: "#c8c8d0", cursor: "#14b8a6", cursorAccent: "#0a0a0c",
  selectionBackground: "#14b8a618", selectionForeground: "#e8e8ec",
  black: "#18181c", red: "#f87171", green: "#4ade80", yellow: "#fbbf24",
  blue: "#60a5fa", magenta: "#c084fc", cyan: "#22d3ee", white: "#c8c8d0",
  brightBlack: "#52525c", brightRed: "#fca5a5", brightGreen: "#86efac", brightYellow: "#fde68a",
  brightBlue: "#93c5fd", brightMagenta: "#d8b4fe", brightCyan: "#67e8f9", brightWhite: "#f4f4f5",
};

const VIEWPORTS: Record<Viewport, { w: number; h: number }> = {
  desktop: { w: 0, h: 0 },
  tablet: { w: 768, h: 1024 },
  mobile: { w: 390, h: 844 },
};

// ─── Icons (SVG) ─────────────────────────────────────────────────────────────

function TabIcon({ cmd, size = 14 }: { cmd: string; size?: number }) {
  const s = { width: size, height: size };
  switch (cmd) {
    case "shell": return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 17l6-5-6-5" /><path d="M12 19h8" /></svg>;
    case "claude": return <svg {...s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#D97757" /><path d="M8 12l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" /></svg>;
    case "gemini": return <svg {...s} viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4" /><path d="M12 6v12M6 12h12" stroke="#fff" strokeWidth="1.5" /></svg>;
    case "codex": return <svg {...s} viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4" fill="#10A37F" /><path d="M8 12h8M12 8v8" stroke="#fff" strokeWidth="1.5" /></svg>;
    case "aider": return <svg {...s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#8B5CF6" /><path d="M8 14l4-6 4 6" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>;
    case "ollama": return <svg {...s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#333" /><circle cx="12" cy="10" r="3" fill="#fff" /><path d="M7 18c0-3 2.5-5 5-5s5 2 5 5" fill="#fff" /></svg>;
    default: return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;
  }
}

function CliIcon({ provider, size = 14 }: { provider: string; size?: number }) {
  const cmdMap: Record<string, string> = { anthropic: "claude", google: "gemini", openai: "codex", aider: "aider", ollama: "ollama" };
  return <TabIcon cmd={cmdMap[provider] || "shell"} size={size} />;
}

function FileIcon({ name, isDir, size = 12 }: { name: string; isDir: boolean; size?: number }) {
  const s = { width: size, height: size };
  if (isDir) return <svg {...s} viewBox="0 0 24 24" fill="currentColor" className="text-[#52525c]"><path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const colors: Record<string, string> = {
    ts: "#3b82f6", tsx: "#3b82f6", js: "#eab308", jsx: "#eab308", json: "#a3a3a3",
    css: "#a855f7", scss: "#a855f7", html: "#f97316", md: "#52525c",
    rs: "#f97316", toml: "#52525c", yaml: "#52525c", yml: "#52525c",
    png: "#60a5fa", jpg: "#60a5fa", svg: "#60a5fa", ico: "#60a5fa",
    lock: "#3f3f46", gitignore: "#3f3f46",
  };
  return <svg {...s} viewBox="0 0 24 24" fill="none" stroke={colors[ext] || "#3f3f46"} strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /><path d="M14 2v6h6" /></svg>;
}

function KodiqIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
      <defs>
        <radialGradient id="ki-bg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>
        <radialGradient id="ki-glow" cx="50%" cy="45%" r="35%">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ki-dot" cx="45%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="60%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0d9488" />
        </radialGradient>
      </defs>
      <rect width="1024" height="1024" rx="228" fill="url(#ki-bg)" />
      <rect x="2" y="2" width="1020" height="1020" rx="226" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
      <circle cx="512" cy="480" r="320" fill="url(#ki-glow)" />
      <path d="M310 360L400 512L310 664" stroke="rgba(255,255,255,0.07)" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M714 360L624 512L714 664" stroke="rgba(255,255,255,0.07)" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="512" cy="512" r="100" fill="url(#ki-dot)" />
      <circle cx="492" cy="488" r="30" fill="rgba(255,255,255,0.12)" />
    </svg>
  );
}

function KodiqDot({ size = 5 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <defs>
        <radialGradient id="kd" cx="45%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="60%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0d9488" />
        </radialGradient>
      </defs>
      <circle cx="10" cy="10" r="10" fill="url(#kd)" />
    </svg>
  );
}

function getTabLabel(cmd: string): string {
  const m: Record<string, string> = { shell: "Терминал", claude: "Claude Code", gemini: "Gemini CLI", codex: "Codex CLI", aider: "Aider", ollama: "Ollama" };
  return m[cmd] || cmd;
}

// ─── XTerm Instance ──────────────────────────────────────────────────────────

function TerminalInstance({ terminalId, isActive }: { terminalId: string; isActive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const { write, onData, onExit, resize } = useTerminal(terminalId);

  useEffect(() => {
    if (!containerRef.current) return;
    const term = new XTerm({
      theme: XTERM_THEME, fontSize: 13, lineHeight: 1.5,
      fontFamily: "'SF Mono', 'JetBrains Mono', 'Menlo', monospace",
      fontWeight: "400", fontWeightBold: "600",
      cursorBlink: true, cursorStyle: "bar", cursorWidth: 2,
      scrollback: 10000, allowProposedApi: true, macOptionIsMeta: true, drawBoldTextInBrightColors: false,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    requestAnimationFrame(() => { fit.fit(); term.focus(); });
    termRef.current = term;
    fitRef.current = fit;

    term.onData((data) => write(data));
    const cleanData = onData((data: string) => term.write(data));
    const cleanExit = onExit(() => term.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n"));

    let timer: ReturnType<typeof setTimeout>;
    const obs = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => requestAnimationFrame(() => { fit.fit(); resize(term.cols, term.rows); }), 150);
    });
    obs.observe(containerRef.current);

    return () => { obs.disconnect(); clearTimeout(timer); cleanData(); cleanExit(); term.dispose(); termRef.current = null; fitRef.current = null; };
  }, [terminalId]);

  useEffect(() => {
    if (isActive && termRef.current) { termRef.current.focus(); fitRef.current?.fit(); }
  }, [isActive]);

  return <div ref={containerRef} className="absolute inset-0 overflow-hidden" style={{ display: isActive ? "block" : "none" }} />;
}

// ─── File Tree ───────────────────────────────────────────────────────────────

function FileTreeItem({ entry, depth }: { entry: FileEntry; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (!entry.isDir) return;
    if (expanded) { setExpanded(false); return; }
    if (children === null) {
      setLoading(true);
      try { setChildren(await invoke<FileEntry[]>("read_dir", { path: entry.path })); } catch { setChildren([]); }
      setLoading(false);
    }
    setExpanded(true);
  }, [entry, expanded, children]);

  const pl = 12 + depth * 14;

  return (
    <>
      <button onClick={toggle} className="w-full flex items-center gap-1.5 h-[26px] text-[11px] hover:bg-white/[0.03] transition-colors text-left" style={{ paddingLeft: pl }}>
        {entry.isDir ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 text-[#3f3f46] transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}><path d="M9 18l6-6-6-6" /></svg>
        ) : <span className="w-[10px] shrink-0" />}
        <FileIcon name={entry.name} isDir={entry.isDir} size={12} />
        <span className={`truncate ${entry.isDir ? "text-[#a1a1aa]" : "text-[#71717a]"}`}>{entry.name}</span>
      </button>
      {expanded && children && children.map((c) => <FileTreeItem key={c.path} entry={c} depth={depth + 1} />)}
      {loading && <div className="h-[26px] flex items-center text-[10px] text-[#3f3f46]" style={{ paddingLeft: pl + 24 }}>Загрузка...</div>}
    </>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  // Layout state
  const [splitRatio, setSplitRatio] = useState(() => { const s = localStorage.getItem("kodiq-split-ratio"); return s ? parseFloat(s) : 0.5; });
  const [isDragging, setIsDragging] = useState(false);
  const [projectPath, setProjectPath] = useState<string | null>(() => localStorage.getItem("kodiq-project-path"));
  const containerRef = useRef<HTMLDivElement>(null);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);

  // Terminal state
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [cliTools, setCliTools] = useState<CliTool[]>([]);
  const [showNewMenu, setShowNewMenu] = useState(false);

  // Recent projects
  const [recentProjects, setRecentProjects] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("kodiq-recent-projects") || "[]"); } catch { return []; }
  });

  // Preview state
  const [previewUrl, setPreviewUrl] = useState("http://localhost:3000");
  const [previewInput, setPreviewInput] = useState("http://localhost:3000");
  const [previewStatus, setPreviewStatus] = useState<"loading" | "ready" | "error">("loading");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [autoDetected, setAutoDetected] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Persist ──
  useEffect(() => { localStorage.setItem("kodiq-split-ratio", String(splitRatio)); }, [splitRatio]);
  useEffect(() => { projectPath ? localStorage.setItem("kodiq-project-path", projectPath) : localStorage.removeItem("kodiq-project-path"); }, [projectPath]);
  useEffect(() => { localStorage.setItem("kodiq-recent-projects", JSON.stringify(recentProjects)); }, [recentProjects]);

  const addToRecent = useCallback((path: string) => {
    setRecentProjects((prev) => [path, ...prev.filter((p) => p !== path)].slice(0, 5));
  }, []);

  // ── Split drag ──
  useEffect(() => {
    if (!isDragging) return;
    const move = (e: MouseEvent) => { if (!containerRef.current) return; const r = containerRef.current.getBoundingClientRect(); setSplitRatio(Math.min(0.8, Math.max(0.2, (e.clientX - r.left) / r.width))); };
    const up = () => setIsDragging(false);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
  }, [isDragging]);

  // ── Sidebar: load directory ──
  useEffect(() => {
    if (!projectPath) { setFileEntries([]); return; }
    invoke<FileEntry[]>("read_dir", { path: projectPath }).then(setFileEntries).catch(() => setFileEntries([]));
  }, [projectPath]);

  const handleOpenFolder = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false, title: "Открыть проект" });
    if (selected && typeof selected === "string") { setProjectPath(selected); addToRecent(selected); }
  }, [addToRecent]);

  const handleOpenRecent = useCallback((path: string) => {
    setProjectPath(path);
    addToRecent(path);
  }, [addToRecent]);

  const handleCloseProject = useCallback(() => {
    // Close all terminal tabs
    tabs.forEach((tab) => closeTerminalPty(tab.id).catch(() => {}));
    setTabs([]);
    setActiveTabId(null);
    setProjectPath(null);
    setFileEntries([]);
    setPreviewStatus("error");
  }, [tabs]);

  // ── Terminal: detect CLI tools ──
  useEffect(() => { detectCliTools().then(setCliTools).catch(() => {}); }, []);

  // ── Terminal: spawn initial tab ──
  useEffect(() => { if (tabs.length === 0) handleNewTab("shell"); }, []);

  const handleNewTab = useCallback(async (command: string) => {
    try {
      const id = await spawnTerminal(command === "shell" ? undefined : command, projectPath || undefined);
      setTabs((prev) => [...prev, { id, label: getTabLabel(command), command }]);
      setActiveTabId(id);
      setShowNewMenu(false);
    } catch (err) { console.error("Failed to spawn terminal:", err); }
  }, [projectPath]);

  const handleCloseTab = useCallback(async (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await closeTerminalPty(tabId).catch(() => {});
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) setActiveTabId(next.length > 0 ? next[next.length - 1].id : null);
      return next;
    });
  }, [activeTabId]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "t") { e.preventDefault(); handleNewTab("shell"); }
      if (e.metaKey && e.key === "w") { e.preventDefault(); if (activeTabId) handleCloseTab(activeTabId); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNewTab, handleCloseTab, activeTabId]);

  // ── Preview: auto-detect ports ──
  useEffect(() => {
    const unlisten = listen<{ id: string; port: number; url: string }>("port-detected", (event) => {
      setPreviewUrl(event.payload.url);
      setPreviewInput(event.payload.url);
      setPreviewStatus("loading");
      setAutoDetected(true);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // ── Preview: probe URL ──
  useEffect(() => {
    setPreviewStatus("loading");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    fetch(previewUrl, { mode: "no-cors", signal: ctrl.signal }).then(() => setPreviewStatus("ready")).catch(() => setPreviewStatus("error"));
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [previewUrl]);

  const navigatePreview = useCallback(() => {
    let t = previewInput.trim();
    if (t && !t.startsWith("http")) t = "http://" + t;
    setPreviewUrl(t); setPreviewInput(t); setPreviewStatus("loading"); setAutoDetected(false);
  }, [previewInput]);

  const refreshPreview = useCallback(() => { if (iframeRef.current) { setPreviewStatus("loading"); iframeRef.current.src = previewUrl; } }, [previewUrl]);

  // ── Derived ──
  const installedCli = cliTools.filter((t) => t.installed);
  const notInstalledCli = cliTools.filter((t) => !t.installed);
  const projectName = projectPath?.split("/").pop() || "";
  const vp = VIEWPORTS[viewport];

  // ─── Welcome Screen ────────────────────────────────────────────────────────

  if (!projectPath) {
    return (
      <div className="flex flex-col h-screen w-screen bg-[#08080a]">
        {/* Title bar */}
        <header className="flex items-center h-[52px] shrink-0 select-none" data-tauri-drag-region>
          <div className="w-[80px] shrink-0" data-tauri-drag-region />
          <div className="flex-1" data-tauri-drag-region />
          <div className="w-[80px] shrink-0" data-tauri-drag-region />
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-10 max-w-[320px] w-full px-6">
            {/* Logo */}
            <div className="animate-fade-rise">
              <KodiqIcon size={56} />
            </div>

            {/* Actions */}
            <div className="w-full space-y-2 animate-fade-rise-delay-1">
              <button onClick={handleOpenFolder} className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200 group">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-[#71717a] group-hover:text-[#a1a1aa] transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[13px] text-[#e4e4e7] font-medium">Открыть проект</div>
                  <div className="text-[11px] text-[#52525c] mt-0.5">Выберите существующую папку</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#3f3f46] group-hover:text-[#52525c] transition-colors"><path d="M9 18l6-6-6-6" /></svg>
              </button>
              <button className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200 group opacity-50 cursor-not-allowed" disabled>
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-[#71717a]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[13px] text-[#e4e4e7] font-medium">Новый проект</div>
                  <div className="text-[11px] text-[#52525c] mt-0.5">Создать с нуля</div>
                </div>
                <span className="text-[9px] text-[#3f3f46] font-medium uppercase tracking-wider">Скоро</span>
              </button>
            </div>

            {/* Recent projects */}
            {recentProjects.length > 0 && (
              <div className="w-full space-y-2 animate-fade-rise-delay-2">
                <div className="text-[10px] text-[#3f3f46] font-medium uppercase tracking-[0.08em] px-1">Недавние</div>
                <div className="space-y-px">
                  {recentProjects.map((path) => (
                    <button key={path} onClick={() => handleOpenRecent(path)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group text-left">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#3f3f46] shrink-0"><path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                      <span className="text-[12px] text-[#71717a] group-hover:text-[#a1a1aa] truncate transition-colors">{path.split("/").pop()}</span>
                      <span className="text-[10px] text-[#27272a] truncate ml-auto font-mono hidden group-hover:block">{path.split("/").slice(-2, -1)[0]}/</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI tools */}
            {cliTools.length > 0 && (
              <div className={`w-full space-y-2 ${recentProjects.length > 0 ? "animate-fade-rise-delay-3" : "animate-fade-rise-delay-2"}`}>
                <div className="text-[10px] text-[#3f3f46] font-medium uppercase tracking-[0.08em] px-1">AI-инструменты</div>
                <div className="space-y-px">
                  {installedCli.map((tool) => (
                    <div key={tool.bin} className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
                      <CliIcon provider={tool.provider} size={14} />
                      <span className="text-[12px] text-[#a1a1aa] flex-1">{tool.name}</span>
                      <span className="text-[10px] text-[#3f3f46] font-mono">{tool.version.split("(")[0]?.trim()}</span>
                    </div>
                  ))}
                  {notInstalledCli.map((tool) => (
                    <div key={tool.bin} className="flex items-center gap-2.5 px-3 py-2 rounded-lg opacity-30">
                      <CliIcon provider={tool.provider} size={14} />
                      <span className="text-[12px] text-[#52525c] flex-1">{tool.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Version */}
            <div className="text-[10px] text-[#27272a] animate-fade-rise-delay-3">v0.1.0</div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Work Layout ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen w-screen bg-[#08080a]">
      {/* Title bar */}
      <header className="flex items-center h-[52px] px-4 border-b border-white/[0.06] shrink-0 select-none" data-tauri-drag-region>
        <div className="w-[80px] shrink-0" data-tauri-drag-region />
        <div className="flex-1 flex items-center justify-center gap-2" data-tauri-drag-region>
          <span data-tauri-drag-region><KodiqDot size={7} /></span>
          <span className="text-[12px] text-[#52525c] font-medium" data-tauri-drag-region>Kodiq</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#27272a]" data-tauri-drag-region><path d="M9 18l6-6-6-6" /></svg>
          <span className="text-[12px] text-[#a1a1aa] font-medium" data-tauri-drag-region>{projectName}</span>
        </div>
        <div className="w-[80px] flex items-center justify-end gap-2" data-tauri-drag-region>
          {tabs.length > 1 && <span className="text-[10px] text-[#3f3f46] tabular-nums" data-tauri-drag-region>{tabs.length}</span>}
          <button onClick={handleCloseProject} className="w-6 h-6 tool-btn" title="Закрыть проект">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center w-11 border-r border-white/[0.06] shrink-0 sidebar-animate">
            <button onClick={() => setSidebarCollapsed(false)} className="w-11 h-10 tool-btn" title="Развернуть">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <button onClick={handleOpenFolder} className="w-11 h-10 tool-btn" title="Открыть папку">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col w-52 border-r border-white/[0.06] shrink-0 overflow-hidden sidebar-animate">
            <div className="flex items-center h-9 px-2.5 shrink-0">
              <button onClick={() => setSidebarCollapsed(true)} className="w-6 h-6 tool-btn mr-1.5 shrink-0" title="Свернуть">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span className="text-[11px] text-[#71717a] font-medium truncate flex-1">{projectName}</span>
              <button onClick={handleOpenFolder} className="w-6 h-6 tool-btn shrink-0" title="Открыть папку">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-0.5 sidebar-scroll">
              {fileEntries.length > 0 ? fileEntries.map((e) => <FileTreeItem key={e.path} entry={e} depth={0} />) : <div className="px-3 py-6 text-[10px] text-[#3f3f46] text-center">Пусто</div>}
            </div>
          </div>
        )}

        {/* Terminal + Preview split */}
        <div ref={containerRef} className="flex flex-1 overflow-hidden" style={{ cursor: isDragging ? "col-resize" : undefined }}>
          {/* Terminal panel */}
          <div className="relative overflow-hidden" style={{ width: `${splitRatio * 100}%`, background: XTERM_THEME.background }}>
            <div className="flex flex-col h-full">
              {/* Tab bar */}
              <div className="flex items-center h-9 border-b border-white/[0.06] shrink-0 overflow-x-auto">
                <div className="flex items-center flex-1 min-w-0">
                  {tabs.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTabId(tab.id)} className={`group flex items-center gap-1.5 h-9 px-3 text-[11px] border-r border-white/[0.04] shrink-0 transition-colors tab-animate ${activeTabId === tab.id ? "text-[#e4e4e7]" : "text-[#52525c] hover:text-[#a1a1aa] hover:bg-white/[0.02]"}`} style={{ background: activeTabId === tab.id ? XTERM_THEME.background : undefined }}>
                      <TabIcon cmd={tab.command} size={12} />
                      <span className="truncate max-w-[100px]">{tab.label}</span>
                      <span onClick={(e) => handleCloseTab(tab.id, e)} className="ml-1 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] text-[#52525c] hover:text-[#a1a1aa] transition-all text-[11px]">×</span>
                    </button>
                  ))}
                </div>
                <div className="relative shrink-0">
                  <button onClick={() => setShowNewMenu(!showNewMenu)} className="w-9 h-9 tool-btn" title="Новый терминал (⌘T)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                  {showNewMenu && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-[#18181c] border border-white/[0.08] rounded-lg shadow-2xl shadow-black/50 z-50 py-1 dropdown-menu">
                      <button onClick={() => handleNewTab("shell")} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[#a1a1aa] hover:bg-white/[0.04] transition-colors">
                        <TabIcon cmd="shell" size={13} />
                        <span className="flex-1 text-left">Терминал</span>
                        <kbd className="text-[9px] text-[#3f3f46] font-mono">⌘T</kbd>
                      </button>
                      {installedCli.length > 0 && <div className="my-1 border-t border-white/[0.04]" />}
                      {installedCli.map((tool) => (
                        <button key={tool.bin} onClick={() => handleNewTab(tool.bin)} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[#a1a1aa] hover:bg-white/[0.04] transition-colors">
                          <CliIcon provider={tool.provider} size={13} />
                          <span className="flex-1 text-left">{tool.name}</span>
                        </button>
                      ))}
                      {notInstalledCli.length > 0 && (
                        <>
                          <div className="my-1 border-t border-white/[0.04]" />
                          {notInstalledCli.map((tool) => (
                            <div key={tool.bin} className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-[#3f3f46]">
                              <span className="opacity-40"><CliIcon provider={tool.provider} size={13} /></span>
                              <span>{tool.name}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Terminal instances */}
              <div className="relative flex-1">
                {tabs.map((tab) => <TerminalInstance key={tab.id} terminalId={tab.id} isActive={tab.id === activeTabId} />)}
                {tabs.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <TabIcon cmd="shell" size={20} />
                      <p className="text-[12px] text-[#3f3f46]">Нет терминалов</p>
                    </div>
                  </div>
                )}
              </div>
              {showNewMenu && <div className="fixed inset-0 z-40" onClick={() => setShowNewMenu(false)} />}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px cursor-col-resize shrink-0 group relative" onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}>
            <div className={`absolute inset-y-0 -left-[2px] w-[5px] transition-all ${isDragging ? "bg-[#14b8a6]/30" : "bg-transparent group-hover:bg-white/[0.04]"}`} />
            <div className={`absolute inset-0 transition-colors ${isDragging ? "bg-[#14b8a6]" : "bg-white/[0.06]"}`} />
          </div>

          {/* Preview panel */}
          <div className="relative flex-1 overflow-hidden bg-[#08080a]">
            <div className="flex flex-col h-full">
              {/* Preview toolbar */}
              <div className="flex items-center gap-1.5 h-9 px-2 border-b border-white/[0.06] shrink-0">
                <button onClick={refreshPreview} className="w-7 h-7 tool-btn" title="Обновить">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                </button>
                <form onSubmit={(e) => { e.preventDefault(); navigatePreview(); }} className="flex-1">
                  <input type="text" value={previewInput} onChange={(e) => setPreviewInput(e.target.value)} className="w-full h-7 px-2.5 bg-white/[0.02] border border-white/[0.06] rounded-md text-[11px] text-[#71717a] font-mono outline-none focus:border-[#14b8a6]/40 focus:text-[#a1a1aa] transition-colors placeholder:text-[#3f3f46]" placeholder="localhost:3000" />
                </form>
                <div className="flex items-center gap-px shrink-0">
                  {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => (
                    <button key={v} onClick={() => setViewport(v)} className={`w-7 h-7 tool-btn ${viewport === v ? "!text-[#a1a1aa] bg-white/[0.04]" : ""}`} title={v}>
                      {v === "desktop" && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>}
                      {v === "tablet" && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M12 18h.01" /></svg>}
                      {v === "mobile" && <svg width="11" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="3" /><path d="M12 18h.01" /></svg>}
                    </button>
                  ))}
                </div>
                {autoDetected && previewStatus === "ready" && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-[#14b8a6] font-medium shrink-0">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    auto
                  </div>
                )}
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${previewStatus === "ready" ? "bg-emerald-500/80" : previewStatus === "loading" ? "bg-amber-500/60 glow-pulse" : "bg-[#3f3f46]"}`} />
              </div>

              {/* Preview content */}
              <div className="relative flex-1 overflow-hidden">
                {previewStatus === "error" ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-[#3f3f46]"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                      <div>
                        <p className="text-[12px] text-[#52525c]">Сервер не запущен</p>
                        <p className="text-[11px] text-[#3f3f46] mt-1">Запустите <span className="font-mono text-[#52525c]">npm run dev</span> в терминале</p>
                      </div>
                    </div>
                  </div>
                ) : vp.w > 0 ? (
                  <div className="absolute inset-0 flex items-start justify-center pt-4 overflow-auto">
                    <div className="relative shrink-0 rounded-lg border border-white/[0.06] overflow-hidden shadow-2xl shadow-black/40" style={{ width: vp.w, height: vp.h, maxHeight: "calc(100% - 32px)" }}>
                      <iframe ref={iframeRef} src={previewUrl} className="w-full h-full border-0" style={{ background: "#fff" }} title="Preview" onLoad={() => setPreviewStatus("ready")} onError={() => setPreviewStatus("error")} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-[#52525c] font-mono pointer-events-none">{vp.w}×{vp.h}</div>
                    </div>
                  </div>
                ) : (
                  <iframe ref={iframeRef} src={previewUrl} className="w-full h-full border-0" style={{ background: previewStatus === "ready" ? "#fff" : "transparent" }} title="Preview" onLoad={() => setPreviewStatus("ready")} onError={() => setPreviewStatus("error")} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
