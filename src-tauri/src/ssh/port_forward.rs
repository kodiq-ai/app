use super::{ConnectionStatus, SshState};
use crate::error::KodiqError;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

pub struct ActiveForward {
    pub local_port: u16,
    pub remote_host: String,
    pub remote_port: u16,
    pub cancel: CancellationToken,
}

pub struct PortForwardState {
    pub forwards: HashMap<String, ActiveForward>,
}

pub type PfState = Arc<Mutex<PortForwardState>>;

pub fn new_port_forward_state() -> PfState {
    Arc::new(Mutex::new(PortForwardState { forwards: HashMap::new() }))
}

/// Start a local→remote port forward via SSH direct-tcpip channel.
#[tauri::command(async)]
pub async fn ssh_start_forward(
    connection_id: String,
    local_port: u16,
    remote_host: Option<String>,
    remote_port: u16,
    ssh_state: tauri::State<'_, SshState>,
    pf_state: tauri::State<'_, PfState>,
) -> Result<String, KodiqError> {
    let remote_host = remote_host.unwrap_or_else(|| "localhost".to_string());
    let forward_id = format!("pf-{}-{}", local_port, remote_port);

    // Bind local TCP listener
    let listener = TcpListener::bind(format!("127.0.0.1:{}", local_port))
        .await
        .map_err(|e| KodiqError::Ssh(format!("Bind port {}: {}", local_port, e)))?;

    let cancel = CancellationToken::new();
    let cancel_clone = cancel.clone();

    // Store active forward
    {
        let mut state = pf_state.lock().await;
        state.forwards.insert(
            forward_id.clone(),
            ActiveForward {
                local_port,
                remote_host: remote_host.clone(),
                remote_port,
                cancel: cancel.clone(),
            },
        );
    }

    // Clone state references for the spawned task
    let ssh_state_inner = ssh_state.inner().clone();
    let rhost = remote_host.clone();
    let conn_id = connection_id.clone();

    tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = cancel_clone.cancelled() => break,
                accept = listener.accept() => {
                    match accept {
                        Ok((mut local_stream, _)) => {
                            let manager = ssh_state_inner.lock().await;
                            let conn = match manager.get(&conn_id) {
                                Some(c) if c.status == ConnectionStatus::Connected => c,
                                _ => {
                                    tracing::warn!("SSH connection {} not available for port forward", conn_id);
                                    continue;
                                }
                            };

                            // Open direct-tcpip channel
                            match conn.handle.channel_open_direct_tcpip(
                                &rhost, remote_port as u32,
                                "127.0.0.1", local_port as u32,
                            ).await {
                                Ok(channel) => {
                                    let mut remote_stream = channel.into_stream();
                                    // Bidirectional copy
                                    tokio::spawn(async move {
                                        let mut local_buf = [0u8; 8192];
                                        let mut remote_buf = [0u8; 8192];
                                        loop {
                                            tokio::select! {
                                                r = local_stream.read(&mut local_buf) => {
                                                    match r {
                                                        Ok(0) => break,
                                                        Ok(n) => {
                                                            if remote_stream.write_all(&local_buf[..n]).await.is_err() { break; }
                                                        }
                                                        Err(_) => break,
                                                    }
                                                }
                                                r = remote_stream.read(&mut remote_buf) => {
                                                    match r {
                                                        Ok(0) => break,
                                                        Ok(n) => {
                                                            if local_stream.write_all(&remote_buf[..n]).await.is_err() { break; }
                                                        }
                                                        Err(_) => break,
                                                    }
                                                }
                                            }
                                        }
                                    });
                                }
                                Err(e) => {
                                    tracing::error!("Failed to open direct-tcpip: {}", e);
                                }
                            }
                        }
                        Err(e) => {
                            tracing::error!("Accept failed: {}", e);
                            break;
                        }
                    }
                }
            }
        }
        tracing::info!(
            "Port forward stopped: {}:{} → {}:{}",
            "127.0.0.1",
            local_port,
            rhost,
            remote_port
        );
    });

    tracing::info!(
        "Port forward started: 127.0.0.1:{} → {}:{}",
        local_port,
        remote_host,
        remote_port
    );
    Ok(forward_id)
}

/// Stop a port forward.
#[tauri::command(async)]
pub async fn ssh_stop_forward(
    forward_id: String,
    pf_state: tauri::State<'_, PfState>,
) -> Result<(), KodiqError> {
    let mut state = pf_state.lock().await;
    if let Some(fwd) = state.forwards.remove(&forward_id) {
        fwd.cancel.cancel();
        Ok(())
    } else {
        Err(KodiqError::NotFound(format!("Forward not found: {}", forward_id)))
    }
}

/// List active port forwards.
#[tauri::command(async)]
pub async fn ssh_list_forwards(
    pf_state: tauri::State<'_, PfState>,
) -> Result<Vec<serde_json::Value>, KodiqError> {
    let state = pf_state.lock().await;
    Ok(state
        .forwards
        .iter()
        .map(|(id, fwd)| {
            serde_json::json!({
                "id": id,
                "localPort": fwd.local_port,
                "remoteHost": fwd.remote_host,
                "remotePort": fwd.remote_port,
            })
        })
        .collect())
}
