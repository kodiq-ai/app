use std::sync::Mutex;
use tauri::{AppHandle, Manager, Webview, WebviewBuilder, WebviewUrl};

use super::devtools::DevToolsBridge;

// -- Preview State ────────────────────────────────────────────────

pub struct PreviewState {
    pub webview: Option<Webview>,
    pub bridge: Option<DevToolsBridge>,
}

impl PreviewState {
    pub fn new() -> Self {
        Self {
            webview: None,
            bridge: None,
        }
    }
}

pub type PreviewManager = Mutex<PreviewState>;

pub fn new_preview_state() -> PreviewManager {
    Mutex::new(PreviewState::new())
}

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

    // Start DevTools bridge (WebSocket server for agent.js)
    let bridge = DevToolsBridge::start(app.clone()).map_err(|e| format!("DevTools bridge: {e}"))?;
    let agent_js = super::devtools::agent_script(bridge.port);

    // Create new webview as a child of the main window
    let window = app
        .get_window("main")
        .ok_or("Main window not found")?;

    let webview = window
        .add_child(
            WebviewBuilder::new(
                "preview",
                WebviewUrl::External(
                    url.parse().map_err(|e: url::ParseError| e.to_string())?,
                ),
            )
            .initialization_script(&agent_js)
            .auto_resize(),
            tauri::LogicalPosition::new(bounds.x, bounds.y),
            tauri::LogicalSize::new(bounds.width, bounds.height),
        )
        .map_err(|e: tauri::Error| e.to_string())?;

    preview.webview = Some(webview);
    preview.bridge = Some(bridge);
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
        if let Ok(current_url) = webview.url() {
            webview.navigate(current_url).map_err(|e| e.to_string())?;
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
    if let Some(ref wv) = preview.webview {
        // Tauri Webview::eval — executes JS in the webview context
        Webview::eval(wv, &expression).map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn preview_destroy(state: tauri::State<'_, PreviewManager>) -> Result<(), String> {
    let mut preview = state.lock().map_err(|e| e.to_string())?;
    if let Some(mut bridge) = preview.bridge.take() {
        bridge.stop();
    }
    if let Some(webview) = preview.webview.take() {
        webview.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}
