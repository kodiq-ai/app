use std::sync::Mutex;
use tauri::webview::PageLoadEvent;
use tauri::{AppHandle, Emitter, Manager, Webview, WebviewBuilder, WebviewUrl};

// ── Academy State ────────────────────────────────────────────────

pub struct AcademyState {
    pub webview: Option<Webview>,
}

impl AcademyState {
    pub fn new() -> Self {
        Self { webview: None }
    }
}

pub type AcademyManager = Mutex<AcademyState>;

pub fn new_academy_state() -> AcademyManager {
    Mutex::new(AcademyState::new())
}

// ── Bounds ───────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
pub struct AcademyBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

// ── Allowed Origins ─────────────────────────────────────────────

const ALLOWED_HOSTS: &[&str] = &["kodiq.ai", "www.kodiq.ai"];

fn is_allowed_url(url: &str) -> bool {
    url::Url::parse(url)
        .map(|u| {
            u.scheme() == "https"
                && u.host_str()
                    .map(|h| {
                        ALLOWED_HOSTS
                            .iter()
                            .any(|allowed| h == *allowed || h.ends_with(&format!(".{allowed}")))
                    })
                    .unwrap_or(false)
        })
        .unwrap_or(false)
}

// ── Initialization Script ────────────────────────────────────────

fn build_init_script(session_js: &Option<String>) -> String {
    let session_block = session_js.as_deref().unwrap_or("");
    format!(
        r#"(function() {{
  window.__kodiq_academy = true;
  {session_block}
}})()"#
    )
}

// ── Tauri Commands ───────────────────────────────────────────────

#[tauri::command]
pub fn academy_navigate(
    app: AppHandle,
    state: tauri::State<'_, AcademyManager>,
    url: String,
    bounds: AcademyBounds,
    session_js: Option<String>,
) -> Result<(), String> {
    // Security: only allow navigation to kodiq.ai domains
    if !is_allowed_url(&url) {
        return Err(format!("Navigation blocked: {url} is not an allowed origin"));
    }

    let mut academy = state.lock().map_err(|e| e.to_string())?;

    // If webview exists, just navigate (localStorage persists on same origin)
    if let Some(ref webview) = academy.webview {
        webview
            .navigate(url.parse().map_err(|e: url::ParseError| e.to_string())?)
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Create new webview as a child of the main window
    let window = app.get_window("main").ok_or("Main window not found")?;

    let init_script = build_init_script(&session_js);
    let app_for_handler = app.clone();
    let webview = window
        .add_child(
            WebviewBuilder::new(
                "academy",
                WebviewUrl::External(url.parse().map_err(|e: url::ParseError| e.to_string())?),
            )
            .initialization_script(&init_script)
            .on_page_load(move |_wv, payload| {
                if matches!(payload.event(), PageLoadEvent::Finished) {
                    let _ = app_for_handler.emit("academy-page-loaded", ());
                }
            })
            .auto_resize(),
            tauri::LogicalPosition::new(bounds.x, bounds.y),
            tauri::LogicalSize::new(bounds.width, bounds.height),
        )
        .map_err(|e: tauri::Error| e.to_string())?;

    academy.webview = Some(webview);
    Ok(())
}

#[tauri::command]
pub fn academy_resize(
    state: tauri::State<'_, AcademyManager>,
    bounds: AcademyBounds,
) -> Result<(), String> {
    let academy = state.lock().map_err(|e| e.to_string())?;
    if let Some(ref webview) = academy.webview {
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
pub fn academy_reload(state: tauri::State<'_, AcademyManager>) -> Result<(), String> {
    let academy = state.lock().map_err(|e| e.to_string())?;
    if let Some(ref webview) = academy.webview {
        if let Ok(current_url) = webview.url() {
            webview.navigate(current_url).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn academy_execute_js(
    state: tauri::State<'_, AcademyManager>,
    expression: String,
) -> Result<(), String> {
    let academy = state.lock().map_err(|e| e.to_string())?;
    if let Some(ref wv) = academy.webview {
        // Tauri Webview::eval — executes JS in the academy webview context
        Webview::eval(wv, &expression).map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn academy_destroy(state: tauri::State<'_, AcademyManager>) -> Result<(), String> {
    let mut academy = state.lock().map_err(|e| e.to_string())?;
    if let Some(webview) = academy.webview.take() {
        webview.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}
