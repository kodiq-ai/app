// ── DevTools WebSocket Bridge ────────────────────────────────────────────────
// Accepts WebSocket connections from the injected agent.js in the preview
// webview, parses console/error messages, and emits Tauri events to React.

use std::net::TcpListener;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tungstenite::accept;

// -- Agent Script ─────────────────────────────────────────────────────────────

const AGENT_TEMPLATE: &str = include_str!("agent.js");

/// Returns the agent JS with the WebSocket port baked in.
pub fn agent_script(port: u16) -> String {
    AGENT_TEMPLATE.replace("__KODIQ_DEVTOOLS_PORT__", &port.to_string())
}

// -- Console Event ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct ConsoleEvent {
    pub level: String,
    pub args: Vec<serde_json::Value>,
    pub timestamp: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack: Option<String>,
}

// -- DevTools Bridge ──────────────────────────────────────────────────────────

pub struct DevToolsBridge {
    pub port: u16,
    stop: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

impl DevToolsBridge {
    /// Starts a WebSocket server on a random available port.
    /// Spawns a background thread that accepts connections from agent.js
    /// and emits `preview://console` events to the React frontend.
    pub fn start(app: AppHandle) -> Result<Self, String> {
        let listener =
            TcpListener::bind("127.0.0.1:0").map_err(|e| format!("bind failed: {e}"))?;

        let port = listener
            .local_addr()
            .map_err(|e| format!("local_addr: {e}"))?
            .port();

        listener
            .set_nonblocking(true)
            .map_err(|e| format!("set_nonblocking: {e}"))?;

        let stop = Arc::new(AtomicBool::new(false));
        let stop_flag = Arc::clone(&stop);

        let handle = thread::spawn(move || {
            Self::accept_loop(listener, stop_flag, app);
        });

        log::info!("[DevTools] bridge started on port {port}");

        Ok(Self {
            port,
            stop,
            handle: Some(handle),
        })
    }

    /// Stops the bridge and joins the background thread.
    pub fn stop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        if let Some(h) = self.handle.take() {
            let _ = h.join();
        }
        log::info!("[DevTools] bridge stopped");
    }

    // -- Accept Loop ──────────────────────────────────────────────

    fn accept_loop(listener: TcpListener, stop: Arc<AtomicBool>, app: AppHandle) {
        while !stop.load(Ordering::Relaxed) {
            match listener.accept() {
                Ok((stream, _addr)) => {
                    // Blocking mode for tungstenite handshake
                    let _ = stream.set_nonblocking(false);
                    let app_clone = app.clone();
                    let stop_clone = Arc::clone(&stop);
                    thread::spawn(move || {
                        Self::handle_connection(stream, stop_clone, app_clone);
                    });
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    // No pending connection — sleep briefly and retry
                    thread::sleep(Duration::from_millis(50));
                }
                Err(_) => {
                    thread::sleep(Duration::from_millis(100));
                }
            }
        }
    }

    // -- Handle Single Connection ─────────────────────────────────

    fn handle_connection(
        stream: std::net::TcpStream,
        stop: Arc<AtomicBool>,
        app: AppHandle,
    ) {
        let mut ws = match accept(stream) {
            Ok(ws) => ws,
            Err(e) => {
                log::warn!("[DevTools] handshake failed: {e}");
                return;
            }
        };

        while !stop.load(Ordering::Relaxed) {
            let msg = match ws.read() {
                Ok(msg) => msg,
                Err(_) => break, // Connection closed
            };

            if msg.is_text() {
                let text = msg.into_text().unwrap_or_default();
                if let Ok(raw) = serde_json::from_str::<serde_json::Value>(&text) {
                    // Only forward "console" type messages
                    if raw.get("type").and_then(|v| v.as_str()) == Some("console") {
                        let event = ConsoleEvent {
                            level: raw
                                .get("level")
                                .and_then(|v| v.as_str())
                                .unwrap_or("log")
                                .to_string(),
                            args: raw
                                .get("args")
                                .and_then(|v| v.as_array())
                                .cloned()
                                .unwrap_or_default(),
                            timestamp: raw
                                .get("timestamp")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            stack: raw
                                .get("stack")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                        };

                        let _ = app.emit("preview://console", &event);
                    }
                }
            }
        }

        let _ = ws.close(None);
    }
}

impl Drop for DevToolsBridge {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        // Don't join in Drop — may deadlock if thread is blocked on read
    }
}
