use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::Emitter;

struct PtyInstance {
    writer: Box<dyn Write + Send>,
    master: Box<dyn portable_pty::MasterPty + Send>,
    #[allow(dead_code)]
    label: String,
}

struct AppState {
    terminals: HashMap<String, PtyInstance>,
    next_id: u32,
}

/// Spawn a new terminal with optional command
/// If `command` is empty/None — spawns user's $SHELL
/// If `command` is "claude" — spawns claude CLI
/// Returns the terminal ID
#[tauri::command]
fn spawn_terminal(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
    command: Option<String>,
    cwd: Option<String>,
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
    let (program, args, label) = resolve_command(&cmd_str);

    let mut cmd = CommandBuilder::new(&program);
    for arg in &args {
        cmd.arg(arg);
    }

    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

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

        // Compile regexes once outside the loop
        // Match patterns like:
        //   http://localhost:3000
        //   http://127.0.0.1:5173
        //   https://localhost:8080/path
        //   localhost:4200
        //   Local:   http://localhost:5173/
        let url_re = Regex::new(
            r"(?:https?://)?(?:localhost|127\.0\.0\.1):(\d{2,5})"
        ).unwrap();
        let ansi_re = Regex::new(r"\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07").unwrap();

        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let text = String::from_utf8_lossy(&buf[..n]).to_string();

                    // Emit PTY output as before
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
        let _ = app_handle.emit(
            "pty-exit",
            serde_json::json!({ "id": tid }),
        );
    });

    log::info!("Terminal spawned: {} ({})", terminal_id, label);
    Ok(terminal_id)
}

/// Write data to a specific terminal
#[tauri::command]
fn write_to_pty(id: String, data: String, state: tauri::State<'_, Mutex<AppState>>) {
    if let Some(ref mut pty) = state.lock().unwrap().terminals.get_mut(&id) {
        let _ = pty.writer.write_all(data.as_bytes());
        let _ = pty.writer.flush();
    }
}

/// Resize a specific terminal
#[tauri::command]
fn resize_pty(id: String, cols: u16, rows: u16, state: tauri::State<'_, Mutex<AppState>>) {
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
fn close_terminal(id: String, state: tauri::State<'_, Mutex<AppState>>) {
    state.lock().unwrap().terminals.remove(&id);
    log::info!("Terminal closed: {}", id);
}

/// Detect which AI CLI tools are installed
#[tauri::command]
fn detect_cli_tools() -> Vec<serde_json::Value> {
    let tools = vec![
        ("claude", "Claude Code", "anthropic"),
        ("gemini", "Gemini CLI", "google"),
        ("codex", "Codex CLI", "openai"),
        ("aider", "Aider", "aider"),
        ("ollama", "Ollama", "ollama"),
    ];

    tools
        .into_iter()
        .map(|(bin, name, provider)| {
            let installed = std::process::Command::new("which")
                .arg(bin)
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false);

            let version = if installed {
                std::process::Command::new(bin)
                    .arg("--version")
                    .output()
                    .ok()
                    .and_then(|o| {
                        String::from_utf8(o.stdout)
                            .ok()
                            .map(|s| s.trim().to_string())
                    })
                    .unwrap_or_default()
            } else {
                String::new()
            };

            serde_json::json!({
                "bin": bin,
                "name": name,
                "provider": provider,
                "installed": installed,
                "version": version,
            })
        })
        .collect()
}

/// Resolve command string to (program, args, label)
fn resolve_command(cmd: &str) -> (String, Vec<String>, String) {
    match cmd.trim() {
        "" | "shell" | "zsh" | "bash" => {
            let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
            let label = shell.split('/').last().unwrap_or("shell").to_string();
            (shell, vec![], label)
        }
        "claude" => ("claude".to_string(), vec![], "Claude Code".to_string()),
        "gemini" => ("gemini".to_string(), vec![], "Gemini CLI".to_string()),
        "codex" => ("codex".to_string(), vec![], "Codex CLI".to_string()),
        "aider" => ("aider".to_string(), vec![], "Aider".to_string()),
        "ollama" => ("ollama".to_string(), vec!["run".to_string(), "llama3".to_string()], "Ollama".to_string()),
        other => {
            // Custom command: split by spaces
            let parts: Vec<String> = other.split_whitespace().map(String::from).collect();
            let program = parts.first().cloned().unwrap_or_default();
            let label = program.split('/').last().unwrap_or("custom").to_string();
            let args = parts.into_iter().skip(1).collect();
            (program, args, label)
        }
    }
}

// Keep old commands for backward compatibility during migration
#[tauri::command]
fn spawn_shell(app: tauri::AppHandle, state: tauri::State<'_, Mutex<AppState>>) {
    let _ = spawn_terminal(app, state, None, None);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(AppState {
            terminals: HashMap::new(),
            next_id: 0,
        }))
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            spawn_terminal,
            write_to_pty,
            resize_pty,
            close_terminal,
            detect_cli_tools,
            spawn_shell,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
