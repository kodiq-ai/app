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

// -- JS Templates (injected into preview via eval) ───────────────

const JS_CLICK: &str = r#"{ var el = document.querySelector(__SEL__); if (el) el.click(); }"#;

const JS_FILL: &str = r#"{
  var el = document.querySelector(__SEL__);
  if (el) {
    el.value = __VAL__;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}"#;

const JS_HOVER: &str = r#"{ var el = document.querySelector(__SEL__); if (el) el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })); }"#;

const JS_INSPECT: &str = r#"(function() {
  var el = document.querySelector(__SEL__);
  if (!el) { window.__kodiq_send({ type: "inspect-result", data: null }); return; }
  var rect = el.getBoundingClientRect();
  var cs = window.getComputedStyle(el);
  var styles = {};
  var keys = ["color","background-color","font-size","font-family","padding","margin","border","display","position","width","height"];
  for (var i = 0; i < keys.length; i++) styles[keys[i]] = cs.getPropertyValue(keys[i]);
  window.__kodiq_send({
    type: "inspect-result",
    data: {
      tagName: el.tagName.toLowerCase(),
      id: el.id || null,
      className: el.className || null,
      textContent: (el.textContent || "").substring(0, 500),
      boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      computedStyles: styles
    }
  });
})()"#;

const JS_SNAPSHOT: &str = r##"(function() {
  function walk(node, depth) {
    if (depth > 10) return null;
    if (node.nodeType === 3) {
      var t = node.textContent.trim();
      return t ? { tag: "#text", role: null, text: t, children: [] } : null;
    }
    if (node.nodeType !== 1) return null;
    var el = node;
    var tag = el.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "noscript") return null;
    var o = { tag: tag, role: el.getAttribute("role") || null, text: null, children: [] };
    if (el.id) o.id = el.id;
    if (el.getAttribute("aria-label")) o.ariaLabel = el.getAttribute("aria-label");
    if (el.href) o.href = el.href;
    if (el.src) o.src = el.src;
    if (el.type) o.type = el.type;
    if (el.name) o.name = el.name;
    if (el.value !== undefined && el.value !== "") o.value = String(el.value);
    for (var i = 0; i < el.childNodes.length; i++) {
      var child = walk(el.childNodes[i], depth + 1);
      if (child) o.children.push(child);
    }
    if (o.children.length === 0) o.text = (el.textContent || "").trim().substring(0, 200) || null;
    return o;
  }
  window.__kodiq_send({ type: "snapshot-result", data: walk(document.body, 0) });
})()"##;

const JS_COLOR_SCHEME: &str = r#"(function() {
  var s = __VAL__;
  document.documentElement.style.colorScheme = s;
  var m = document.querySelector('meta[name="color-scheme"]');
  if (!m) { m = document.createElement("meta"); m.name = "color-scheme"; document.head.appendChild(m); }
  m.content = s;
})()"#;

const JS_SCREENSHOT: &str = r##"(function() {
  try {
    var html = document.documentElement;
    var xml = new XMLSerializer().serializeToString(html);
    var w = html.scrollWidth, h = html.scrollHeight;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'">'
      + '<foreignObject width="100%" height="100%">'
      + '<html xmlns="http://www.w3.org/1999/xhtml">' + xml + '</html>'
      + '</foreignObject></svg>';
    var blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function() {
      var c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      try {
        var data = c.toDataURL("image/png");
        window.__kodiq_send({ type: "screenshot-result", data: data });
      } catch(e) {
        window.__kodiq_send({ type: "screenshot-result", data: null });
      }
    };
    img.onerror = function() {
      URL.revokeObjectURL(url);
      window.__kodiq_send({ type: "screenshot-result", data: null });
    };
    img.src = url;
  } catch(e) {
    window.__kodiq_send({ type: "screenshot-result", data: null });
  }
})()"##;

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
pub fn preview_click(
    state: tauri::State<'_, PreviewManager>,
    selector: String,
) -> Result<(), String> {
    let preview = state.lock().map_err(|e| e.to_string())?;
    if let Some(ref wv) = preview.webview {
        let sel = serde_json::to_string(&selector).map_err(|e| e.to_string())?;
        let js = JS_CLICK.replace("__SEL__", &sel);
        Webview::eval(wv, &js).map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn preview_fill(
    state: tauri::State<'_, PreviewManager>,
    selector: String,
    value: String,
) -> Result<(), String> {
    let preview = state.lock().map_err(|e| e.to_string())?;
    if let Some(ref wv) = preview.webview {
        let sel = serde_json::to_string(&selector).map_err(|e| e.to_string())?;
        let val = serde_json::to_string(&value).map_err(|e| e.to_string())?;
        let js = JS_FILL.replace("__SEL__", &sel).replace("__VAL__", &val);
        Webview::eval(wv, &js).map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn preview_hover(
    state: tauri::State<'_, PreviewManager>,
    selector: String,
) -> Result<(), String> {
    let preview = state.lock().map_err(|e| e.to_string())?;
    if let Some(ref wv) = preview.webview {
        let sel = serde_json::to_string(&selector).map_err(|e| e.to_string())?;
        let js = JS_HOVER.replace("__SEL__", &sel);
        Webview::eval(wv, &js).map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn preview_inspect(
    state: tauri::State<'_, PreviewManager>,
    selector: String,
) -> Result<(), String> {
    let preview = state.lock().map_err(|e| e.to_string())?;
    if let Some(ref wv) = preview.webview {
        let sel = serde_json::to_string(&selector).map_err(|e| e.to_string())?;
        let js = JS_INSPECT.replace("__SEL__", &sel);
        Webview::eval(wv, &js).map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn preview_snapshot(
    state: tauri::State<'_, PreviewManager>,
) -> Result<(), String> {
    let preview = state.lock().map_err(|e| e.to_string())?;
    if let Some(ref wv) = preview.webview {
        Webview::eval(wv, JS_SNAPSHOT).map_err(|e: tauri::Error| e.to_string())?;
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

#[tauri::command]
pub fn preview_set_color_scheme(
    state: tauri::State<'_, PreviewManager>,
    scheme: String,
) -> Result<(), String> {
    let preview = state.lock().map_err(|e| e.to_string())?;
    if let Some(ref wv) = preview.webview {
        let val = serde_json::to_string(&scheme).map_err(|e| e.to_string())?;
        let js = JS_COLOR_SCHEME.replace("__VAL__", &val);
        Webview::eval(wv, &js).map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn preview_screenshot(
    state: tauri::State<'_, PreviewManager>,
) -> Result<(), String> {
    let preview = state.lock().map_err(|e| e.to_string())?;
    if let Some(ref wv) = preview.webview {
        Webview::eval(wv, JS_SCREENSHOT).map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}
