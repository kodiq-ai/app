# Preview Integration — Design Document

**Date:** 2026-02-24
**Scope:** Full-featured preview panel with DevTools (Claude Code Desktop parity)
**Version target:** v0.5.0

---

## Overview

Replace current iframe-based preview with a **native Tauri WebView** in the same window.
Add DevTools (console, network), responsive testing, screenshots, and element inspection.

Goal: feature parity with Claude Code Desktop's preview system (~20 commands).

---

## Architecture

### Window Layout

```
┌─────────────────────────────────────────────────────┐
│  Tauri Window                                       │
│ ┌──────────────────────┬──────────────────────────┐ │
│ │  WebView "main"      │  WebView "preview"       │ │
│ │  (React app)         │  ┌────────────────────┐  │ │
│ │                      │  │ localhost:PORT      │  │ │
│ │  ┌─ Editor ────────┐ │  │                    │  │ │
│ │  │  CodeMirror 6   │ │  │   user's app       │  │ │
│ │  └─────────────────┘ │  │                    │  │ │
│ │  ┌─ Terminal ──────┐ │  └────────────────────┘  │ │
│ │  │  xterm.js       │ │  ┌─ DevTools ─────────┐  │ │
│ │  └─────────────────┘ │  │ Console │ Network  │  │ │
│ │                      │  └────────────────────┘  │ │
│ └──────────────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

- **Main WebView**: React app (editor, terminal, sidebar, DevTools UI)
- **Preview WebView**: user's dev server (natively rendered, no iframe restrictions)
- DevTools panels render in **main** WebView, positioned below preview visually

### Key Technology: Tauri 2 Multi-Webview

Requires `unstable` feature flag in Cargo.toml. Enables multiple webviews in a single window.

- `Webview::eval(js)` — execute JS in preview regardless of loaded URL
- Positioning: Rust controls webview bounds (x, y, width, height)
- React renders placeholder `<div>`, ResizeObserver reports bounds, Rust repositions webview

**Note on eval():** Tauri's `Webview::eval()` is the standard Tauri 2 API for
webview-to-JS communication. It runs in the webview's JS context (like Chrome
DevTools console), not in a security-sensitive eval() context. This is the
documented and intended way to communicate with webviews in Tauri.

### Communication Paths

| Direction | Mechanism | Use case |
|-----------|-----------|----------|
| Rust to Preview | `Webview::eval(js)` | Click, fill, screenshot, inject agent |
| Preview to Rust | WebSocket (localhost) | Console logs, network requests from injected agent |
| Rust to React | Tauri events (`emit`) | New console entry, screenshot ready, snapshot data |
| React to Rust | Tauri `invoke()` | Start server, take screenshot, click element |

---

## Rust Backend

Three new modules in `src-tauri/src/preview/`:

### `manager.rs` — PreviewManager

Manages preview webview lifecycle.

| Method | Description |
|--------|-------------|
| `create_webview(url, bounds)` | Create preview webview in main window |
| `navigate(url)` | Change loaded URL |
| `resize(x, y, w, h)` | Reposition/resize (called from React via ResizeObserver) |
| `execute_js(js) -> String` | Execute JS in preview webview, return result |
| `take_screenshot() -> Vec<u8>` | Capture webview as PNG |
| `show() / hide()` | Toggle visibility |
| `destroy()` | Remove webview |

State: `Arc<Mutex<Option<Webview>>>` reference to the preview webview.

### `server.rs` — ProcessManager

Manages dev server processes.

| Method | Description |
|--------|-------------|
| `start(config) -> ServerId` | Launch process from launch.json config |
| `stop(id)` | Kill process |
| `list() -> Vec<ServerInfo>` | Active servers with status |
| `get_logs(id, filter?) -> Vec<LogEntry>` | stdout/stderr with level filtering |
| `detect_port(stdout) -> Option<u16>` | Regex port detection (reuse from terminal/manager.rs) |

Reads config from `launch.json` in project root. Processes via `portable-pty` (already a dependency).

### `devtools.rs` — DevToolsBridge

WebSocket server for preview-to-Rust communication.

| Method | Description |
|--------|-------------|
| `start() -> port` | Start WS server on random localhost port |
| `inject_agent(webview)` | Inject DevTools Agent JS via Webview::eval() |
| `on_console(callback)` | Subscribe to console.* events |
| `on_network(callback)` | Subscribe to fetch/XHR events |
| `get_snapshot(webview) -> String` | Get accessibility tree via Webview::eval() |

Auto-reinjects agent on every navigation event.

### DevTools Agent (JS, injected into preview)

Bundled as string in Rust via `include_str!()`, injected via `Webview::eval()`:

```
Agent responsibilities:
- Monkey-patch console.log/warn/error/info -> send to WebSocket
- Monkey-patch XMLHttpRequest.open/send -> intercept requests
- Monkey-patch fetch() -> intercept requests
- Listen for click/hover commands from WebSocket
- Provide DOM query capabilities (querySelector, computed styles)
- Accessibility snapshot (walk DOM tree -> structured output)
```

---

## Frontend

### File Structure

```
src/features/preview/
├── components/
│   ├── PreviewPanel.tsx        # Container: toolbar + webview placeholder + devtools
│   ├── PreviewToolbar.tsx      # URL bar, refresh, viewport, screenshot, devtools toggle
│   ├── ConsolePanel.tsx        # Console log viewer with level filters
│   ├── NetworkPanel.tsx        # Network request table + response detail
│   └── ViewportFrame.tsx       # Device frame overlay for mobile/tablet
├── store/
│   └── previewSlice.ts         # Extended Zustand slice
└── lib/
    └── commands.ts             # Typed invoke() wrappers for all preview commands
```

### PreviewSlice (extend existing)

```typescript
// -- Existing fields (keep) ──────────────────────────
previewUrl: string | null
previewOpen: boolean
viewport: "desktop" | "tablet" | "mobile"

// -- New fields ──────────────────────────────────────
serverId: string | null
serverStatus: "stopped" | "starting" | "running" | "error"
servers: ServerInfo[]
consoleLogs: ConsoleEntry[]
networkRequests: NetworkEntry[]
devtoolsOpen: boolean
devtoolsTab: "console" | "network"
inspectMode: boolean
```

### PreviewPanel — Webview Positioning

React renders an empty `<div ref={previewRef} />` as placeholder.

```
1. ResizeObserver watches placeholder div
2. On resize -> invoke("preview_resize", { x, y, w, h })
3. Rust repositions native webview to match
4. Result: seamless panel that behaves like a React component
```

DevTools panels (ConsolePanel, NetworkPanel) render as normal React components
below the placeholder div, inside the main webview.

---

## Tauri Commands

All registered in `lib.rs`, typed wrappers in `shared/lib/tauri.ts`.

### Server Management
| Command | Params | Returns |
|---------|--------|---------|
| `preview_start` | `{ name: string }` | `ServerId` |
| `preview_stop` | `{ id: string }` | `()` |
| `preview_list` | — | `Vec<ServerInfo>` |
| `preview_logs` | `{ id, level?, search? }` | `Vec<LogEntry>` |

### Visual Inspection
| Command | Params | Returns |
|---------|--------|---------|
| `preview_screenshot` | `{ id }` | `Vec<u8>` (PNG) |
| `preview_snapshot` | `{ id }` | `String` (accessibility tree) |
| `preview_inspect` | `{ id, selector, styles? }` | `InspectResult` |

### Interaction
| Command | Params | Returns |
|---------|--------|---------|
| `preview_click` | `{ id, selector }` | `()` |
| `preview_fill` | `{ id, selector, value }` | `()` |
| `preview_hover` | `{ id, selector }` | `()` |
| `preview_eval` | `{ id, expression }` | `String` (JSON result) |

### Debugging
| Command | Params | Returns |
|---------|--------|---------|
| `preview_console_logs` | `{ id, level? }` | `Vec<ConsoleEntry>` |
| `preview_network` | `{ id, filter? }` | `Vec<NetworkEntry>` |

### Responsive
| Command | Params | Returns |
|---------|--------|---------|
| `preview_resize_viewport` | `{ id, preset? or width?, height? }` | `()` |
| `preview_set_color_scheme` | `{ id, scheme }` | `()` |

### Navigation
| Command | Params | Returns |
|---------|--------|---------|
| `preview_navigate` | `{ id, url }` | `()` |
| `preview_navigate_back` | `{ id }` | `()` |
| `preview_reload` | `{ id }` | `()` |

---

## Implementation Plan

### Phase 1 — Native WebView (Days 1-2)
**Checkpoint: preview opens as native webview instead of iframe**

1. Add `unstable` feature to Tauri in Cargo.toml
2. Create `src-tauri/src/preview/mod.rs` + `manager.rs`
3. Implement `create_webview`, `navigate`, `resize`, `show/hide`, `destroy`
4. Register commands: `preview_navigate`, `preview_reload`, `preview_navigate_back`
5. Update `PreviewPanel.tsx`: replace iframe with placeholder div + ResizeObserver
6. Wire up port detection -> auto-create preview webview

### Phase 2 — Server Management (Day 2)
**Checkpoint: start/stop dev servers from UI, auto-detect port**

1. Create `server.rs` with ProcessManager
2. Parse `launch.json` config
3. Implement `preview_start`, `preview_stop`, `preview_list`, `preview_logs`
4. Extend PreviewSlice with server state
5. Add server selector to PreviewToolbar

### Phase 3 — DevTools Console (Day 3)
**Checkpoint: console.log from preview appears in DevTools panel**

1. Create `devtools.rs` with WebSocket server
2. Write DevTools Agent JS (console.* monkey-patching)
3. Inject agent on webview creation and navigation
4. Implement `preview_console_logs` command
5. Build ConsolePanel.tsx component
6. Wire Tauri events: WS message -> emit -> React updates

### Phase 4 — DevTools Network (Day 3-4)
**Checkpoint: network requests from preview visible in Network tab**

1. Extend Agent: fetch/XHR interception
2. Implement `preview_network` command
3. Build NetworkPanel.tsx (table + response body viewer)

### Phase 5 — Interaction and Inspection (Day 4)
**Checkpoint: click elements, fill inputs, inspect CSS from Kodiq**

1. Implement `preview_click`, `preview_fill`, `preview_hover`, `preview_eval`
2. Implement `preview_inspect`, `preview_snapshot`
3. Build InspectOverlay (highlight on hover, show computed styles)

### Phase 6 — Responsive and Screenshots (Day 5)
**Checkpoint: viewport presets with device frames, one-click screenshots**

1. Implement `preview_resize_viewport`, `preview_set_color_scheme`
2. Implement `preview_screenshot`
3. Build ViewportFrame.tsx (device bezels for mobile/tablet)
4. Add screenshot button to toolbar
5. Polish: animations, transitions, dark mode testing

---

## Open Questions

1. **WebSocket dependency**: use `tungstenite` (sync) or `tokio-tungstenite` (async)?
   Decision needed based on whether we add tokio to the project.
2. **Screenshot method**: Tauri webview capture API vs html2canvas via JS execution?
   Test both, Tauri API preferred if available.
3. **Agent bundling**: inline string in Rust or read from file at runtime?
   Inline via `include_str!()` for single-binary distribution.
