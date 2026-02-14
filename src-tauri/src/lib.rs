use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::Emitter;

struct PtyState {
    writer: Box<dyn Write + Send>,
    master: Box<dyn portable_pty::MasterPty + Send>,
}

#[tauri::command]
fn spawn_shell(app: tauri::AppHandle, state: tauri::State<'_, Mutex<Option<PtyState>>>) {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .expect("Failed to open PTY");

    // Get user's default shell
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());

    let mut cmd = CommandBuilder::new(&shell);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    // Set HOME directory
    if let Ok(home) = std::env::var("HOME") {
        cmd.cwd(&home);
    }

    let _child = pair.slave.spawn_command(cmd).expect("Failed to spawn shell");
    drop(pair.slave);

    let writer = pair.master.take_writer().expect("Failed to get PTY writer");
    let mut reader = pair.master.try_clone_reader().expect("Failed to get PTY reader");

    // Store writer and master for later use
    {
        let mut pty = state.lock().unwrap();
        *pty = Some(PtyState {
            writer,
            master: pair.master,
        });
    }

    // Read PTY output in background thread
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let text = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_handle.emit("pty-output", &text);
                }
                Err(_) => break,
            }
        }
    });

    log::info!("Shell spawned: {}", shell);
}

#[tauri::command]
fn write_to_pty(data: String, state: tauri::State<'_, Mutex<Option<PtyState>>>) {
    if let Some(ref mut pty) = *state.lock().unwrap() {
        let _ = pty.writer.write_all(data.as_bytes());
        let _ = pty.writer.flush();
    }
}

#[tauri::command]
fn resize_pty(cols: u16, rows: u16, state: tauri::State<'_, Mutex<Option<PtyState>>>) {
    if let Some(ref pty) = *state.lock().unwrap() {
        let _ = pty.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        });
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(None::<PtyState>))
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
        .invoke_handler(tauri::generate_handler![spawn_shell, write_to_pty, resize_pty])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
