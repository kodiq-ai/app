use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex, OnceLock};

use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

// -- Regex patterns (allocated once) ──────────────────────────────────

fn url_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?:https?://)?(?:localhost|127\.0\.0\.1):(\d{2,5})").unwrap())
}

fn ansi_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07").unwrap())
}

// -- Types ────────────────────────────────────────────────────────────

#[derive(Clone, Serialize)]
pub struct ServerInfo {
    pub id: String,
    pub name: String,
    pub port: Option<u16>,
    pub status: String,
    pub started_at: i64,
}

#[derive(Clone, Serialize)]
pub struct LogEntry {
    pub timestamp: i64,
    pub level: String,
    pub message: String,
}

#[derive(Deserialize)]
pub struct ServerConfig {
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub cwd: Option<String>,
    pub env: Option<HashMap<String, String>>,
}

// -- State ────────────────────────────────────────────────────────────

struct ServerProcess {
    info: ServerInfo,
    logs: Vec<LogEntry>,
    child: Option<Child>,
}

pub struct ServerManager {
    servers: HashMap<String, ServerProcess>,
    next_id: u32,
}

impl ServerManager {
    pub fn new() -> Self {
        Self { servers: HashMap::new(), next_id: 0 }
    }
}

pub type ServerState = Arc<Mutex<ServerManager>>;

pub fn new_server_state() -> ServerState {
    Arc::new(Mutex::new(ServerManager::new()))
}

// -- Helpers ──────────────────────────────────────────────────────────

fn now() -> i64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64
}

fn detect_level(line: &str) -> &'static str {
    let lower = line.to_lowercase();
    if lower.contains("error") || lower.contains("fatal") {
        "error"
    } else if lower.contains("warn") {
        "warn"
    } else {
        "info"
    }
}

/// Read lines from a stream, detect ports & log levels, store logs, emit events.
fn spawn_reader_thread(
    reader: impl std::io::Read + Send + 'static,
    server_id: String,
    state: ServerState,
    app: AppHandle,
) {
    std::thread::spawn(move || {
        let buf = BufReader::new(reader);
        let url_re = url_regex();
        let ansi_re = ansi_regex();

        for line in buf.lines() {
            let Ok(raw) = line else { break };
            if raw.is_empty() {
                continue;
            }

            let clean = ansi_re.replace_all(&raw, "").to_string();
            let level = detect_level(&clean);

            let entry = LogEntry { timestamp: now(), level: level.into(), message: clean.clone() };

            // Store log + port detection (brief lock)
            if let Ok(mut mgr) = state.lock() {
                if let Some(server) = mgr.servers.get_mut(&server_id) {
                    server.logs.push(entry.clone());

                    // Cap at 5000 entries (drop oldest 1000)
                    if server.logs.len() > 5000 {
                        server.logs.drain(..1000);
                    }

                    // Detect port on first match
                    if server.info.port.is_none() {
                        for cap in url_re.captures_iter(&clean) {
                            if let Some(port_str) = cap.get(1) {
                                if let Ok(port) = port_str.as_str().parse::<u16>() {
                                    if port >= 1024 {
                                        server.info.port = Some(port);
                                        server.info.status = "running".into();

                                        let _ = app.emit(
                                            "preview://server-ready",
                                            serde_json::json!({
                                                "id": server_id,
                                                "port": port,
                                                "url": format!("http://localhost:{}", port),
                                            }),
                                        );
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Emit log event (outside of lock)
            let _ = app.emit(
                "preview://server-log",
                serde_json::json!({
                    "id": server_id,
                    "entry": entry,
                }),
            );
        }

        // Stream ended — mark as stopped (only first thread to finish emits exit)
        if let Ok(mut mgr) = state.lock() {
            if let Some(server) = mgr.servers.get_mut(&server_id) {
                if server.info.status != "stopped" {
                    server.info.status = "stopped".into();
                    let _ =
                        app.emit("preview://server-exit", serde_json::json!({ "id": server_id }));
                }
            }
        }
    });
}

// -- Tauri Commands ───────────────────────────────────────────────────

#[tauri::command]
pub fn preview_start_server(
    app: AppHandle,
    state: tauri::State<'_, ServerState>,
    config: ServerConfig,
) -> Result<String, String> {
    // Generate server ID and register in state
    let server_id = {
        let mut mgr = state.lock().map_err(|e| e.to_string())?;
        let id = format!("server-{}", mgr.next_id);
        mgr.next_id += 1;

        mgr.servers.insert(
            id.clone(),
            ServerProcess {
                info: ServerInfo {
                    id: id.clone(),
                    name: config.name.clone(),
                    port: None,
                    status: "starting".into(),
                    started_at: now(),
                },
                logs: Vec::new(),
                child: None,
            },
        );

        id
    };

    // Build process
    let mut cmd = Command::new(&config.command);
    cmd.args(&config.args).stdout(Stdio::piped()).stderr(Stdio::piped());

    if let Some(ref cwd) = config.cwd {
        cmd.current_dir(cwd);
    }

    // Inherit essential env vars
    if let Ok(path) = std::env::var("PATH") {
        cmd.env("PATH", &path);
    }
    #[cfg(not(target_os = "windows"))]
    if let Ok(home) = std::env::var("HOME") {
        cmd.env("HOME", &home);
    }
    #[cfg(target_os = "windows")]
    {
        if let Ok(profile) = std::env::var("USERPROFILE") {
            cmd.env("USERPROFILE", &profile);
        }
        if let Ok(appdata) = std::env::var("APPDATA") {
            cmd.env("APPDATA", &appdata);
        }
    }

    if let Some(ref env_vars) = config.env {
        for (k, v) in env_vars {
            cmd.env(k, v);
        }
    }

    // Spawn — clean up state on failure
    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            if let Ok(mut mgr) = state.lock() {
                mgr.servers.remove(&server_id);
            }
            return Err(format!("Failed to spawn server: {}", e));
        }
    };

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    // Store child handle for killing later
    {
        let mut mgr = state.lock().map_err(|e| e.to_string())?;
        if let Some(server) = mgr.servers.get_mut(&server_id) {
            server.child = Some(child);
        }
    }

    // Spawn reader threads
    if let Some(out) = stdout {
        spawn_reader_thread(out, server_id.clone(), state.inner().clone(), app.clone());
    }
    if let Some(err) = stderr {
        spawn_reader_thread(err, server_id.clone(), state.inner().clone(), app);
    }

    tracing::info!("Preview server started: {} ({})", server_id, config.name);
    Ok(server_id)
}

#[tauri::command]
pub fn preview_stop_server(state: tauri::State<'_, ServerState>, id: String) -> Result<(), String> {
    let mut mgr = state.lock().map_err(|e| e.to_string())?;
    if let Some(server) = mgr.servers.get_mut(&id) {
        if let Some(ref mut child) = server.child {
            let _ = child.kill();
        }
        server.child = None;
        server.info.status = "stopped".into();
        tracing::info!("Preview server stopped: {}", id);
    }
    Ok(())
}

#[tauri::command]
pub fn preview_list_servers(
    state: tauri::State<'_, ServerState>,
) -> Result<Vec<ServerInfo>, String> {
    let mgr = state.lock().map_err(|e| e.to_string())?;
    Ok(mgr.servers.values().map(|s| s.info.clone()).collect())
}

#[tauri::command]
pub fn preview_server_logs(
    state: tauri::State<'_, ServerState>,
    id: String,
    level: Option<String>,
    search: Option<String>,
) -> Result<Vec<LogEntry>, String> {
    let mgr = state.lock().map_err(|e| e.to_string())?;
    let server = mgr.servers.get(&id).ok_or("Server not found")?;

    let logs: Vec<LogEntry> = server
        .logs
        .iter()
        .filter(|log| {
            if let Some(ref lvl) = level {
                if &log.level != lvl {
                    return false;
                }
            }
            if let Some(ref q) = search {
                if !log.message.to_lowercase().contains(&q.to_lowercase()) {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    Ok(logs)
}
