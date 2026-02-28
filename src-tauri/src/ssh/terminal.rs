use super::{ConnectionStatus, SshState};
use crate::error::KodiqError;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

/// Active SSH terminal sessions (separate from local PTY state)
pub struct SshTerminalState {
    pub sessions: HashMap<String, SshTerminalSession>,
    pub next_id: u32,
}

pub struct SshTerminalSession {
    pub connection_id: String,
    pub writer: tokio::sync::mpsc::Sender<Vec<u8>>,
    pub resize_tx: tokio::sync::mpsc::Sender<(u32, u32)>,
    pub cancel: CancellationToken,
}

pub type SshTermState = Arc<Mutex<SshTerminalState>>;

pub fn new_ssh_terminal_state() -> SshTermState {
    Arc::new(Mutex::new(SshTerminalState { sessions: HashMap::new(), next_id: 0 }))
}

/// Spawn a remote terminal via SSH. Returns terminal ID.
/// Emits same `pty-output` and `pty-exit` events as local terminals.
/// Lock is released before network I/O to avoid deadlocking concurrent operations.
#[tauri::command(async)]
pub async fn ssh_spawn_terminal(
    connection_id: String,
    cols: Option<u32>,
    rows: Option<u32>,
    app: tauri::AppHandle,
    ssh_state: tauri::State<'_, SshState>,
    term_state: tauri::State<'_, SshTermState>,
) -> Result<String, KodiqError> {
    let cols = cols.unwrap_or(80);
    let rows = rows.unwrap_or(24);

    // Clone handle inside tight lock scope — never hold lock across await
    let handle = {
        let manager = ssh_state.lock().await;
        let conn = manager
            .get(&connection_id)
            .ok_or_else(|| KodiqError::ConnectionNotFound(connection_id.clone()))?;

        if conn.status != ConnectionStatus::Connected {
            return Err(KodiqError::Ssh("Connection is not active".into()));
        }

        conn.handle.clone()
    }; // lock released here

    // All network I/O happens without holding any lock
    let channel = handle
        .channel_open_session()
        .await
        .map_err(|e| KodiqError::Ssh(format!("Open session channel: {}", e)))?;

    channel
        .request_pty(true, "xterm-256color", cols, rows, 0, 0, &[])
        .await
        .map_err(|e| KodiqError::Ssh(format!("Request PTY: {}", e)))?;

    channel
        .request_shell(true)
        .await
        .map_err(|e| KodiqError::Ssh(format!("Request shell: {}", e)))?;

    // Generate terminal ID
    let terminal_id = {
        let mut state = term_state.lock().await;
        let id = format!("ssh-term-{}", state.next_id);
        state.next_id += 1;
        id
    };

    // Split channel into reader/writer
    let mut stream = channel.into_stream();

    // Writer channel (frontend → SSH)
    let (write_tx, mut write_rx) = tokio::sync::mpsc::channel::<Vec<u8>>(256);
    let (resize_tx, mut resize_rx) = tokio::sync::mpsc::channel::<(u32, u32)>(16);
    let cancel = CancellationToken::new();
    let cancel_clone = cancel.clone();

    // Store session
    {
        let mut state = term_state.lock().await;
        state.sessions.insert(
            terminal_id.clone(),
            SshTerminalSession {
                connection_id: connection_id.clone(),
                writer: write_tx,
                resize_tx,
                cancel,
            },
        );
    }

    // Background task: read from SSH → emit pty-output, write from frontend → SSH
    let tid = terminal_id.clone();
    let app_handle = app.clone();

    tokio::spawn(async move {
        use tauri::Emitter;
        let mut buf = [0u8; 4096];

        loop {
            tokio::select! {
                // Cancellation from ssh_close_terminal
                _ = cancel_clone.cancelled() => break,
                // Read from SSH channel
                result = stream.read(&mut buf) => {
                    match result {
                        Ok(0) => break, // EOF
                        Ok(n) => {
                            let text = String::from_utf8_lossy(&buf[..n]).to_string();
                            let _ = app_handle.emit(
                                "pty-output",
                                serde_json::json!({ "id": tid, "data": text }),
                            );
                        }
                        Err(_) => break,
                    }
                }
                // Write from frontend to SSH channel
                Some(data) = write_rx.recv() => {
                    if stream.write_all(&data).await.is_err() {
                        break;
                    }
                }
                // Resize (note: resize via channel is handled differently in russh)
                Some((_cols, _rows)) = resize_rx.recv() => {
                    // russh channel resize requires the original Channel, not the stream.
                    // For now, resize is a no-op on SSH terminals.
                    // TODO: implement via channel_msg when russh supports it on streams.
                }
                else => break,
            }
        }

        // Terminal exited
        let _ = app_handle.emit("pty-exit", serde_json::json!({ "id": tid }));
        tracing::info!("SSH terminal exited: {}", tid);
    });

    tracing::info!("SSH terminal spawned: {} on connection {}", terminal_id, connection_id);
    Ok(terminal_id)
}

/// Write data to an SSH terminal.
#[tauri::command(async)]
pub async fn ssh_write(
    id: String,
    data: String,
    term_state: tauri::State<'_, SshTermState>,
) -> Result<(), KodiqError> {
    let state = term_state.lock().await;
    if let Some(session) = state.sessions.get(&id) {
        session
            .writer
            .send(data.into_bytes())
            .await
            .map_err(|_| KodiqError::Ssh("Terminal write channel closed".into()))?;
    }
    Ok(())
}

/// Resize an SSH terminal.
#[tauri::command(async)]
pub async fn ssh_resize(
    id: String,
    cols: u32,
    rows: u32,
    term_state: tauri::State<'_, SshTermState>,
) -> Result<(), KodiqError> {
    let state = term_state.lock().await;
    if let Some(session) = state.sessions.get(&id) {
        let _ = session.resize_tx.send((cols, rows)).await;
    }
    Ok(())
}

/// Close an SSH terminal session. Cancels the background I/O task.
#[tauri::command(async)]
pub async fn ssh_close_terminal(
    id: String,
    term_state: tauri::State<'_, SshTermState>,
) -> Result<(), KodiqError> {
    let mut state = term_state.lock().await;
    if let Some(session) = state.sessions.remove(&id) {
        session.cancel.cancel(); // signal background task to stop
    }
    tracing::info!("SSH terminal closed: {}", id);
    Ok(())
}
