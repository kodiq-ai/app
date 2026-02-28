use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::Read;
use std::sync::{Arc, Mutex};
use tauri::Emitter;

use crate::terminal::parser::resolve_command;

// ── Chat State ──────────────────────────────────────────────────────

/// Handle to a running chat CLI process.
/// Dropping the writer + master closes the PTY and kills the child.
struct ChatProcess {
    master: Box<dyn portable_pty::MasterPty + Send>,
    writer: Box<dyn std::io::Write + Send>,
    thread: Option<std::thread::JoinHandle<()>>,
}

pub struct ChatStateInner {
    process: Option<ChatProcess>,
}

pub type ChatState = Arc<Mutex<ChatStateInner>>;

pub fn new_chat_state() -> ChatState {
    Arc::new(Mutex::new(ChatStateInner { process: None }))
}

// ── Commands ────────────────────────────────────────────────────────

/// Send a message to an AI CLI tool.
/// Spawns the CLI process via PTY, writes the prompt to stdin,
/// and streams stdout chunks back via `chat-chunk` events.
#[tracing::instrument(skip(app, chat_state))]
#[tauri::command]
pub fn chat_send(
    app: tauri::AppHandle,
    chat_state: tauri::State<'_, ChatState>,
    provider: String,
    prompt: String,
    cwd: Option<String>,
) -> Result<(), String> {
    // Kill any existing chat process first
    stop_process(&chat_state);

    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize { rows: 24, cols: 120, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Use the same resolve_command from terminal — maps "claude"→"claude" etc.
    let (program, mut args, _label) = resolve_command(&provider, None);

    // Pass prompt as argument for non-interactive mode
    // claude: `claude -p "prompt"` (print mode — non-interactive, streams to stdout)
    // gemini: `gemini -p "prompt"` (print mode)
    // codex: `codex -q "prompt"` (quiet mode)
    match provider.as_str() {
        "claude" => {
            args.push("-p".to_string());
            args.push(prompt.clone());
        }
        "gemini" => {
            args.push("-p".to_string());
            args.push(prompt.clone());
        }
        "codex" => {
            args.push("-q".to_string());
            args.push(prompt.clone());
        }
        _ => {
            args.push(prompt.clone());
        }
    }

    let mut cmd = CommandBuilder::new(&program);
    for arg in &args {
        cmd.arg(arg);
    }

    // Environment — reuse terminal env setup
    cmd.env("TERM_PROGRAM", "Kodiq");
    cmd.env("TERM_PROGRAM_VERSION", env!("CARGO_PKG_VERSION"));

    if let Ok(path) = std::env::var("PATH") {
        cmd.env("PATH", &path);
    }

    #[cfg(not(target_os = "windows"))]
    {
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        if let Ok(home) = std::env::var("HOME") {
            cmd.env("HOME", &home);
        }
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

    // Set working directory — use project path if available
    if let Some(ref dir) = cwd {
        cmd.cwd(dir);
    } else {
        #[cfg(not(target_os = "windows"))]
        if let Ok(home) = std::env::var("HOME") {
            cmd.cwd(&home);
        }
    }

    let _child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn {}: {}", provider, e))?;
    drop(pair.slave);

    let writer = pair.master.take_writer().map_err(|e| format!("Failed to get writer: {}", e))?;
    let mut reader =
        pair.master.try_clone_reader().map_err(|e| format!("Failed to get reader: {}", e))?;

    // Strip ANSI escape codes from chat output for clean markdown
    let ansi_re = regex::Regex::new(r"\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07").unwrap();

    // Stream stdout in background thread
    let app_handle = app.clone();
    let prov = provider.clone();
    let thread = std::thread::spawn(move || {
        let mut buf = [0u8; 4096];

        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let raw = String::from_utf8_lossy(&buf[..n]).to_string();
                    // Strip ANSI codes for clean output
                    let clean = ansi_re.replace_all(&raw, "").to_string();

                    if !clean.is_empty() {
                        let _ = app_handle.emit(
                            "chat-chunk",
                            serde_json::json!({
                                "provider": prov,
                                "content": clean,
                            }),
                        );
                    }
                }
                Err(_) => break,
            }
        }

        // Process exited
        let _ = app_handle.emit("chat-done", serde_json::json!({ "provider": prov }));
    });

    // Store the active process
    if let Ok(mut guard) = chat_state.lock() {
        guard.process = Some(ChatProcess { master: pair.master, writer, thread: Some(thread) });
    }

    tracing::info!("Chat process spawned: {}", provider);
    Ok(())
}

/// Stop the currently running chat process.
#[tracing::instrument(skip(chat_state))]
#[tauri::command]
pub fn chat_stop(chat_state: tauri::State<'_, ChatState>) -> Result<(), String> {
    stop_process(&chat_state);
    Ok(())
}

fn stop_process(chat_state: &ChatState) {
    if let Ok(mut guard) = chat_state.lock() {
        if let Some(mut proc) = guard.process.take() {
            // Drop writer first to signal EOF to process
            drop(proc.writer);
            // Drop master to close PTY — this kills the child
            drop(proc.master);
            // Wait for reader thread to finish
            if let Some(thread) = proc.thread.take() {
                let _ = thread.join();
            }
            tracing::info!("Chat process stopped");
        }
    }
}
