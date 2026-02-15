use crate::state::{AppState, PtyInstance};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use regex::Regex;
use std::collections::HashSet;
use std::io::{Read, Write};
use tauri::Emitter;

use super::parser::resolve_command;

/// Spawn a new terminal with optional command.
/// If `command` is empty/None — spawns user's $SHELL.
/// If `command` is "claude" — spawns claude CLI.
/// Returns the terminal ID.
#[tauri::command]
pub fn spawn_terminal(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    command: Option<String>,
    cwd: Option<String>,
    shell: Option<String>,
) -> Result<String, String> {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let cmd_str = command.clone().unwrap_or_default();
    let (program, args, label) = resolve_command(&cmd_str, shell.as_deref());

    let mut cmd = CommandBuilder::new(&program);
    for arg in &args {
        cmd.arg(arg);
    }

    // Environment variables
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.env("TERM_PROGRAM", "Kodiq");
    cmd.env("TERM_PROGRAM_VERSION", "0.1.0");
    cmd.env("__CFBundleIdentifier", "com.kodiq.app");
    cmd.env("BASH_SILENCE_DEPRECATION_WARNING", "1");

    // Set working directory
    if let Some(ref dir) = cwd {
        cmd.cwd(dir);
    } else if let Ok(home) = std::env::var("HOME") {
        cmd.cwd(&home);
    }

    // Inherit PATH so CLI tools are found
    if let Ok(path) = std::env::var("PATH") {
        cmd.env("PATH", &path);
    }
    if let Ok(home) = std::env::var("HOME") {
        cmd.env("HOME", &home);
    }

    let _child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn: {}", e))?;
    drop(pair.slave);

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get writer: {}", e))?;
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get reader: {}", e))?;

    let terminal_id = {
        let mut app_state = state.lock().unwrap();
        let id = format!("term-{}", app_state.next_id);
        app_state.next_id += 1;
        app_state.terminals.insert(
            id.clone(),
            PtyInstance {
                writer,
                master: pair.master,
                label: label.clone(),
            },
        );
        id
    };

    // Read PTY output in background thread + detect localhost URLs
    let app_handle = app.clone();
    let tid = terminal_id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        let mut emitted_ports: HashSet<u16> = HashSet::new();

        let url_re =
            Regex::new(r"(?:https?://)?(?:localhost|127\.0\.0\.1):(\d{2,5})").unwrap();
        let ansi_re = Regex::new(r"\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07").unwrap();

        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let text = String::from_utf8_lossy(&buf[..n]).to_string();

                    let _ = app_handle.emit(
                        "pty-output",
                        serde_json::json!({
                            "id": tid,
                            "data": text,
                        }),
                    );

                    // Strip ANSI escape codes for cleaner matching
                    let clean = ansi_re.replace_all(&text, "").to_string();

                    // Scan for localhost URLs
                    for cap in url_re.captures_iter(&clean) {
                        if let Some(port_str) = cap.get(1) {
                            if let Ok(port) = port_str.as_str().parse::<u16>() {
                                if port >= 1024 && !emitted_ports.contains(&port) {
                                    emitted_ports.insert(port);
                                    let url = format!("http://localhost:{}", port);
                                    log::info!("Port detected in {}: {}", tid, url);
                                    let _ = app_handle.emit(
                                        "port-detected",
                                        serde_json::json!({
                                            "id": tid,
                                            "port": port,
                                            "url": url,
                                        }),
                                    );
                                }
                            }
                        }
                    }
                }
                Err(_) => break,
            }
        }

        // Terminal exited
        let _ = app_handle.emit("pty-exit", serde_json::json!({ "id": tid }));
    });

    log::info!("Terminal spawned: {} ({})", terminal_id, label);
    Ok(terminal_id)
}

/// Write data to a specific terminal
#[tauri::command]
pub fn write_to_pty(id: String, data: String, state: tauri::State<'_, AppState>) {
    if let Some(ref mut pty) = state.lock().unwrap().terminals.get_mut(&id) {
        let _ = pty.writer.write_all(data.as_bytes());
        let _ = pty.writer.flush();
    }
}

/// Resize a specific terminal
#[tauri::command]
pub fn resize_pty(id: String, cols: u16, rows: u16, state: tauri::State<'_, AppState>) {
    if let Some(ref pty) = state.lock().unwrap().terminals.get(&id) {
        let _ = pty.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        });
    }
}

/// Close a terminal
#[tauri::command]
pub fn close_terminal(id: String, state: tauri::State<'_, AppState>) {
    state.lock().unwrap().terminals.remove(&id);
    log::info!("Terminal closed: {}", id);
}
