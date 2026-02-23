# Preview Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace iframe preview with native Tauri 2 Multi-Webview, add DevTools, interaction, and responsive testing — full Claude Code Desktop parity.

**Architecture:** Dual-webview in single window (main React app + preview user site). Rust backend manages webview lifecycle, runs DevTools WebSocket bridge, JS agent injected into preview intercepts console/network. React renders DevTools UI below preview placeholder.

**Tech Stack:** Tauri 2 (unstable multi-webview), React 19, Zustand 5, tungstenite WebSocket, portable-pty

**Design doc:** `docs/plans/2026-02-24-preview-integration.md`

---

## Phase 1: Native WebView (replace iframe)

### Task 1.1: Enable Tauri unstable feature

**Files:**
- Modify: `src-tauri/Cargo.toml:24`

**Step 1: Add unstable feature flag**

In `src-tauri/Cargo.toml`, change line 24:

```toml
# Before
tauri = { version = "2", features = [] }

# After
tauri = { version = "2", features = ["unstable"] }
```

**Step 2: Verify it compiles**

Run: `cd app && pnpm run tauri:dev`
Expected: Builds successfully, app launches (no visible changes yet)

**Step 3: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "feat(preview): enable tauri unstable multi-webview feature"
```

---

### Task 1.2: Create preview Rust module with PreviewState

**Files:**
- Create: `src-tauri/src/preview/mod.rs`
- Create: `src-tauri/src/preview/manager.rs`
- Modify: `src-tauri/src/lib.rs:1` (add `mod preview;`)

**Step 1: Create module structure**

Create `src-tauri/src/preview/mod.rs`:

```rust
pub mod manager;
```

**Step 2: Create manager.rs with PreviewState**

Create `src-tauri/src/preview/manager.rs`:

```rust
use std::sync::Mutex;
use tauri::{AppHandle, Manager, Webview, WebviewBuilder, WebviewUrl};

// -- Preview State ────────────────────────────────────────────────

pub struct PreviewState {
    pub webview: Option<Webview>,
}

impl PreviewState {
    pub fn new() -> Self {
        Self { webview: None }
    }
}

pub type PreviewManager = Mutex<PreviewState>;

pub fn new_preview_state() -> PreviewManager {
    Mutex::new(PreviewState::new())
}
```

**Step 3: Register module and state in lib.rs**

In `src-tauri/src/lib.rs`, add after line 5 (`mod git;`):

```rust
mod preview;
```

In the `tauri::Builder` chain, after `.manage(filesystem::watcher::WatcherState::new())`:

```rust
.manage(preview::manager::new_preview_state())
```

**Step 4: Verify compilation**

Run: `cd app && pnpm run tauri:dev`
Expected: Compiles with new module (no visible changes yet)

**Step 5: Commit**

```bash
git add src-tauri/src/preview/
git add src-tauri/src/lib.rs
git commit -m "feat(preview): add preview module with PreviewState"
```

---

### Task 1.3: Implement Rust preview commands

**Files:**
- Modify: `src-tauri/src/preview/manager.rs` (add 5 commands)
- Modify: `src-tauri/src/lib.rs` (register commands)

**Step 1: Add Tauri commands to manager.rs**

Append to `src-tauri/src/preview/manager.rs`:

```rust
// -- Tauri Commands ───────────────────────────────────────────────

#[derive(serde::Deserialize)]
pub struct PreviewBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[tauri::command]
pub fn preview_navigate(
    app: AppHandle,
    state: tauri::State<'_, PreviewManager>,
    url: String,
    bounds: PreviewBounds,
) -> Result<(), String> {
    let mut preview = state.lock().map_err(|e| e.to_string())?;

    // If webview exists, just navigate
    if let Some(ref webview) = preview.webview {
        webview
            .navigate(url.parse().map_err(|e: url::ParseError| e.to_string())?)
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Create new webview in the main window
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    let webview = window
        .add_child(
            WebviewBuilder::new("preview", WebviewUrl::External(
                url.parse().map_err(|e: url::ParseError| e.to_string())?,
            ))
            .auto_resize(),
            tauri::LogicalPosition::new(bounds.x, bounds.y),
            tauri::LogicalSize::new(bounds.width, bounds.height),
        )
        .map_err(|e| e.to_string())?;

    preview.webview = Some(webview);
    Ok(())
}

#[tauri::command]
pub fn preview_resize(
    state: tauri::State<'_, PreviewManager>,
    bounds: PreviewBounds,
) -> Result<(), String> {
    let preview = state.lock().map_err(|e| e.to_string())?;
    if let Some(ref webview) = preview.webview {
        webview
            .set_position(tauri::LogicalPosition::new(bounds.x, bounds.y))
            .map_err(|e| e.to_string())?;
        webview
            .set_size(tauri::LogicalSize::new(bounds.width, bounds.height))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn preview_reload(state: tauri::State<'_, PreviewManager>) -> Result<(), String> {
    let preview = state.lock().map_err(|e| e.to_string())?;
    if let Some(ref webview) = preview.webview {
        // Navigate to current URL to trigger reload
        if let Ok(url) = webview.url() {
            webview.navigate(url).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn preview_execute_js(
    state: tauri::State<'_, PreviewManager>,
    expression: String,
) -> Result<(), String> {
    let preview = state.lock().map_err(|e| e.to_string())?;
    if let Some(ref webview) = preview.webview {
        webview
            .evaluate_script(&expression)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn preview_destroy(state: tauri::State<'_, PreviewManager>) -> Result<(), String> {
    let mut preview = state.lock().map_err(|e| e.to_string())?;
    if let Some(webview) = preview.webview.take() {
        webview.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

**Step 2: Add `url` crate to Cargo.toml**

In `src-tauri/Cargo.toml` under `[dependencies]`:

```toml
url = "2"
```

**Step 3: Register commands in lib.rs**

In the `invoke_handler` macro, add after the Launch Configs section:

```rust
// Preview
preview::manager::preview_navigate,
preview::manager::preview_resize,
preview::manager::preview_reload,
preview::manager::preview_execute_js,
preview::manager::preview_destroy,
```

**Step 4: Verify compilation**

Run: `cd app && pnpm run tauri:dev`
Expected: Compiles with new commands

**Step 5: Commit**

```bash
git add src-tauri/Cargo.toml
git add src-tauri/src/preview/manager.rs
git add src-tauri/src/lib.rs
git commit -m "feat(preview): implement 5 rust preview commands"
```

---

### Task 1.4: Add TypeScript bridge for preview commands

**Files:**
- Modify: `src/shared/lib/types.ts` (add PreviewBounds type)
- Modify: `src/shared/lib/tauri.ts` (add preview namespace)

**Step 1: Add PreviewBounds type**

In `src/shared/lib/types.ts`, after the `Viewport` type:

```typescript
// -- Preview ─────────────────────────────────────────────
export interface PreviewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

**Step 2: Add preview namespace to tauri.ts**

In `src/shared/lib/tauri.ts`, add import for `PreviewBounds`:

```typescript
import type {
  // ... existing imports ...
  PreviewBounds,
} from "./types";
```

Add at the bottom, before the closing:

```typescript
// -- Preview ─────────────────────────────────────────────
export const preview = {
  navigate: (url: string, bounds: PreviewBounds) =>
    invoke<void>("preview_navigate", { url, bounds }),
  resize: (bounds: PreviewBounds) =>
    invoke<void>("preview_resize", { bounds }),
  reload: () => invoke<void>("preview_reload"),
  executeJs: (expression: string) =>
    invoke<void>("preview_execute_js", { expression }),
  destroy: () => invoke<void>("preview_destroy"),
};
```

**Step 3: Commit**

```bash
git add src/shared/lib/types.ts src/shared/lib/tauri.ts
git commit -m "feat(preview): add typed TS bridge for preview commands"
```

---

### Task 1.5: Extend PreviewSlice with webview state

**Files:**
- Modify: `src/features/preview/store/previewSlice.ts`

**Step 1: Add webview state fields**

Replace the full PreviewSlice interface and creator:

```typescript
// -- Preview Slice ────────────────────────────────────────────────────────────
import type { StateCreator } from "zustand";
import type { Viewport, PreviewBounds } from "@shared/lib/types";
import { db } from "@shared/lib/tauri";

export interface PreviewSlice {
  // -- Existing ───────────────────────────────────────────
  previewUrl: string | null;
  previewOpen: boolean;
  viewport: Viewport;

  // -- Webview state ──────────────────────────────────────
  webviewReady: boolean;
  webviewBounds: PreviewBounds | null;

  // -- Actions ────────────────────────────────────────────
  setPreviewUrl: (url: string | null) => void;
  setPreviewOpen: (open: boolean) => void;
  togglePreview: () => void;
  setViewport: (v: Viewport) => void;
  setWebviewReady: (ready: boolean) => void;
  setWebviewBounds: (bounds: PreviewBounds | null) => void;
}

export const createPreviewSlice: StateCreator<PreviewSlice, [], [], PreviewSlice> = (set) => ({
  previewUrl: null,
  previewOpen: true,
  viewport: "desktop",
  webviewReady: false,
  webviewBounds: null,

  setPreviewUrl: (previewUrl) => set({ previewUrl }),

  setPreviewOpen: (previewOpen) => {
    db.settings
      .set("previewOpen", String(previewOpen))
      .catch((e) => console.error("[DB] setting:", e));
    set({ previewOpen });
  },

  togglePreview: () =>
    set((s) => {
      const next = !s.previewOpen;
      db.settings.set("previewOpen", String(next)).catch((e) => console.error("[DB] setting:", e));
      return { previewOpen: next };
    }),

  setViewport: (viewport) => set({ viewport }),
  setWebviewReady: (webviewReady) => set({ webviewReady }),
  setWebviewBounds: (webviewBounds) => set({ webviewBounds }),
});
```

**Step 2: Commit**

```bash
git add src/features/preview/store/previewSlice.ts
git commit -m "feat(preview): extend slice with webview state"
```

---

### Task 1.6: Replace iframe with native webview in ActivePanel

**Files:**
- Modify: `src/features/preview/components/ActivePanel.tsx`

**Step 1: Rewrite ActivePanel to use ResizeObserver + Tauri webview**

Full replacement for `ActivePanel.tsx`:

```tsx
import { useRef, useEffect, useCallback } from "react";
import { RefreshCw, Monitor, Tablet, Smartphone, Zap, Globe, X } from "lucide-react";
import { useAppStore, type Viewport } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { t } from "@/lib/i18n";
import { preview } from "@shared/lib/tauri";
import type { PreviewBounds } from "@shared/lib/types";

function getViewportConstraints(viewport: Viewport) {
  if (viewport === "tablet") return { maxWidth: 768, maxHeight: 1024 };
  if (viewport === "mobile") return { maxWidth: 390, maxHeight: 844 };
  return null; // desktop = fill container
}

export function ActivePanel() {
  const viewport = useAppStore((s) => s.viewport);
  const setViewport = useAppStore((s) => s.setViewport);
  const previewUrl = useAppStore((s) => s.previewUrl);
  const setPreviewUrl = useAppStore((s) => s.setPreviewUrl);
  const webviewReady = useAppStore((s) => s.webviewReady);
  const setWebviewReady = useAppStore((s) => s.setWebviewReady);
  const setWebviewBounds = useAppStore((s) => s.setWebviewBounds);

  const containerRef = useRef<HTMLDivElement>(null);

  // -- Compute bounds for the native webview ──────────────
  const computeBounds = useCallback((): PreviewBounds | null => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const constraints = getViewportConstraints(viewport);

    let width = rect.width;
    let height = rect.height;
    let x = rect.x;
    let y = rect.y;

    if (constraints) {
      width = Math.min(width, constraints.maxWidth);
      height = Math.min(height, constraints.maxHeight);
      // Center within container
      x = rect.x + (rect.width - width) / 2;
      y = rect.y + (rect.height - height) / 2;
    }

    return { x, y, width, height };
  }, [viewport]);

  // -- Sync bounds with Rust on resize / viewport change ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !webviewReady) return;

    const sync = () => {
      const bounds = computeBounds();
      if (bounds) {
        setWebviewBounds(bounds);
        preview.resize(bounds).catch(console.error);
      }
    };

    const observer = new ResizeObserver(sync);
    observer.observe(el);
    sync(); // initial sync

    return () => observer.disconnect();
  }, [webviewReady, computeBounds, setWebviewBounds]);

  // -- Create webview when URL detected ────────────────────
  useEffect(() => {
    if (!previewUrl) {
      if (webviewReady) {
        preview.destroy().catch(console.error);
        setWebviewReady(false);
      }
      return;
    }

    const bounds = computeBounds();
    if (!bounds) return;

    preview
      .navigate(previewUrl, bounds)
      .then(() => setWebviewReady(true))
      .catch(console.error);
  }, [previewUrl]); // intentionally only on URL change

  // -- Cleanup on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      preview.destroy().catch(() => {});
    };
  }, []);

  const handleRefresh = () => {
    if (webviewReady) preview.reload().catch(console.error);
  };

  const handleClose = () => {
    preview.destroy().catch(console.error);
    setWebviewReady(false);
    setPreviewUrl(null);
  };

  const viewportOptions: { v: Viewport; icon: typeof Monitor; label: string }[] = [
    { v: "desktop", icon: Monitor, label: t("desktop") },
    { v: "tablet", icon: Tablet, label: t("tablet") },
    { v: "mobile", icon: Smartphone, label: t("mobile") },
  ];

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[var(--bg-base)]">
      {/* Toolbar */}
      <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-white/[0.06] px-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleRefresh}
              aria-label="refresh preview"
              className="text-k-text-tertiary hover:text-k-text-secondary"
            >
              <RefreshCw className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("refresh")}</TooltipContent>
        </Tooltip>

        <Input
          type="text"
          value={previewUrl?.split("?")[0] || ""}
          readOnly
          placeholder={t("waitingForServer")}
          className="text-k-text-secondary focus:border-k-accent/40 h-7 flex-1 border-white/[0.06] bg-white/[0.015] px-2.5 font-mono text-[11px]"
        />

        <div className="flex shrink-0 items-center gap-px">
          {viewportOptions.map(({ v, icon: Icon, label }) => (
            <Tooltip key={v}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setViewport(v)}
                  aria-label={label}
                  className={cn(
                    "text-k-text-tertiary hover:text-k-text-secondary",
                    viewport === v && "!text-k-text-secondary bg-white/[0.04]",
                  )}
                >
                  <Icon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {previewUrl ? (
          <>
            <div className="text-k-accent flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium">
              <Zap className="size-2" />
              native
            </div>
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/80" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleClose}
                  className="text-k-text-tertiary hover:text-k-text-secondary"
                >
                  <X className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close preview</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <div className="bg-k-border h-1.5 w-1.5 shrink-0 rounded-full" />
        )}
      </div>

      {/* Preview area — native webview renders over this div */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {previewUrl ? (
          <div className="flex h-full w-full items-center justify-center">
            {/* Native Tauri webview renders on top of this placeholder */}
            <div
              className={cn(
                "h-full bg-white",
                viewport === "tablet" && "max-h-[1024px] w-[768px] rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
                viewport === "mobile" && "max-h-[844px] w-[390px] rounded-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
                viewport === "desktop" && "w-full",
              )}
            />
          </div>
        ) : (
          <div className="flex h-full flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <Globe className="text-k-border size-5" />
              <div>
                <p className="text-k-text-tertiary text-[12px]">{t("serverNotRunning")}</p>
                <p className="text-k-border mt-1 text-[11px]">
                  {t("runDevServer")}{" "}
                  <code className="text-k-text-tertiary font-mono">{t("npmRunDev")}</code>{" "}
                  {t("inTerminal")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Test in dev mode**

Run: `cd app && pnpm run tauri:dev`
Expected: Preview toolbar visible. When dev server runs in terminal and port detected, native webview should appear instead of iframe.

**Step 3: Commit**

```bash
git add src/features/preview/components/ActivePanel.tsx
git commit -m "feat(preview): replace iframe with native Tauri webview"
```

---

## Phase 2: Server Management (5 tasks)

### Task 2.1: Create server.rs ProcessManager

**Files:**
- Create: `src-tauri/src/preview/server.rs`
- Modify: `src-tauri/src/preview/mod.rs`

Create ProcessManager that spawns dev server processes using `portable-pty`. Reads launch.json configs from project root. Tracks processes by ServerId, captures stdout/stderr with level detection (error/warning/info). Reuse regex port detection from terminal module.

### Task 2.2: Implement server Tauri commands

**Files:**
- Modify: `src-tauri/src/preview/server.rs`
- Modify: `src-tauri/src/lib.rs`

Add 4 commands: `preview_start(name) -> ServerId`, `preview_stop(id)`, `preview_list() -> Vec<ServerInfo>`, `preview_logs(id, level?, search?) -> Vec<LogEntry>`. Register in lib.rs handler.

### Task 2.3: Add server types to TS bridge

**Files:**
- Modify: `src/shared/lib/types.ts`
- Modify: `src/shared/lib/tauri.ts`

Add types: `ServerInfo { id, name, port, status, uptime }`, `LogEntry { timestamp, level, message }`. Add `preview.start()`, `preview.stop()`, `preview.list()`, `preview.logs()` to bridge.

### Task 2.4: Extend PreviewSlice with server state

**Files:**
- Modify: `src/features/preview/store/previewSlice.ts`

Add fields: `serverId: string | null`, `serverStatus: "stopped" | "starting" | "running" | "error"`, `servers: ServerInfo[]`. Add actions: `setServerId`, `setServerStatus`, `setServers`.

### Task 2.5: Add server selector to PreviewToolbar

**Files:**
- Modify: `src/features/preview/components/ActivePanel.tsx`

Add dropdown to toolbar showing available launch configs. Start/stop button. Status indicator (starting spinner / running green / error red).

---

## Phase 3: DevTools Console (4 tasks)

### Task 3.1: Create devtools.rs WebSocket bridge

**Files:**
- Create: `src-tauri/src/preview/devtools.rs`
- Modify: `src-tauri/Cargo.toml` (add `tungstenite`)

WebSocket server on random localhost port. Accepts messages from injected JS agent in preview webview. Parses console.log/warn/error/info messages. Emits Tauri events (`preview://console`) to React.

### Task 3.2: Write DevTools Agent JS

**Files:**
- Create: `src-tauri/src/preview/agent.js`

JS script bundled via `include_str!()`. Monkey-patches console.log/warn/error/info → sends JSON to WebSocket. Auto-connects on load. Injected via Tauri webview script execution on every navigation.

### Task 3.3: Build ConsolePanel.tsx

**Files:**
- Create: `src/features/preview/components/ConsolePanel.tsx`
- Modify: `src/features/preview/components/ActivePanel.tsx`

Console log viewer with level filters (all/error/warn/info). Timestamps, color-coded levels. Auto-scroll to bottom. Clear button. Positioned below preview webview.

### Task 3.4: Wire events end-to-end

**Files:**
- Modify: `src/features/preview/store/previewSlice.ts`
- Modify: `src/features/preview/components/ActivePanel.tsx`

Add `consoleLogs: ConsoleEntry[]`, `devtoolsOpen: boolean`, `devtoolsTab: "console" | "network"` to slice. Listen to `preview://console` Tauri events, append to store. Toggle button in toolbar.

---

## Phase 4: DevTools Network (3 tasks)

### Task 4.1: Extend Agent with fetch/XHR interception

**Files:**
- Modify: `src-tauri/src/preview/agent.js`

Monkey-patch `window.fetch()` and `XMLHttpRequest.prototype.open/send`. Capture: method, url, status, duration, headers, body size. Send to WebSocket as network events.

### Task 4.2: Build NetworkPanel.tsx

**Files:**
- Create: `src/features/preview/components/NetworkPanel.tsx`

Network request table: method, URL, status (color-coded), duration, size. Click row to expand response body/headers detail. Filter: all/failed. Search by URL.

### Task 4.3: Wire network events to store

**Files:**
- Modify: `src/features/preview/store/previewSlice.ts`

Add `networkRequests: NetworkEntry[]` to slice. Listen to `preview://network` Tauri events. Add `NetworkEntry` type to shared types.

---

## Phase 5: Interaction and Inspection (3 tasks)

### Task 5.1: Implement interaction commands in Rust

**Files:**
- Modify: `src-tauri/src/preview/manager.rs`
- Modify: `src-tauri/src/lib.rs`

Add commands: `preview_click(selector)`, `preview_fill(selector, value)`, `preview_hover(selector)`. Each runs JS in preview webview via Tauri's script execution API.

### Task 5.2: Implement inspection commands

**Files:**
- Modify: `src-tauri/src/preview/manager.rs`

Add `preview_inspect(selector, styles?) -> InspectResult` — runs JS to get computed styles, bounding box, text content. Add `preview_snapshot() -> String` — walks DOM tree to produce accessibility tree.

### Task 5.3: Add InspectOverlay component

**Files:**
- Create: `src/features/preview/components/InspectOverlay.tsx`

Highlight element on hover (border overlay). Show computed styles tooltip. Toggle via toolbar button. Uses preview_inspect command.

---

## Phase 6: Responsive and Screenshots (4 tasks)

### Task 6.1: Implement responsive commands

**Files:**
- Modify: `src-tauri/src/preview/manager.rs`

Add `preview_resize_viewport(preset? or width?, height?)` — resizes the native webview. Add `preview_set_color_scheme(scheme)` — injects CSS media query override via script execution.

### Task 6.2: Implement screenshot command

**Files:**
- Modify: `src-tauri/src/preview/manager.rs`

Add `preview_screenshot() -> Vec<u8>` — capture webview as PNG using Tauri webview capture API if available, fallback to html2canvas via script execution.

### Task 6.3: Build ViewportFrame.tsx

**Files:**
- Create: `src/features/preview/components/ViewportFrame.tsx`

Device bezels for mobile (iPhone frame) and tablet (iPad frame). CSS-only frames wrapping the preview placeholder. Applied when viewport is not "desktop".

### Task 6.4: Polish and integration test

**Files:**
- All preview files

End-to-end test: start dev server → preview opens → switch viewport → take screenshot → check console → inspect element. Fix edge cases, transitions, dark mode support.

---

## Execution Notes

- Phase 1 is the critical path — after it, user sees native webview instead of iframe
- Each phase has a visible checkpoint the user can verify
- Phases 3-4 require WebSocket dependency decision (sync `tungstenite` recommended since no tokio yet)
- Phase 5-6 can be parallelized after Phase 3
