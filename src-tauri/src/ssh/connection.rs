use super::{
    client::KodiqSshHandler, AuthMethod, ConnectionStatus, SshActiveConnection, SshConnection,
    SshConnectionConfig, SshState,
};
use crate::error::KodiqError;
use crate::state::DbState;
use russh::client;
use std::sync::Arc;

/// Connect to an SSH server. Returns the active connection info.
///
/// - `password`: only used for AuthMethod::Password or key passphrase. Never persisted.
/// - `config`: connection configuration (host, port, username, auth_method, key_path).
#[tauri::command(async)]
pub async fn ssh_connect(
    config: SshConnectionConfig,
    password: Option<String>,
    ssh_state: tauri::State<'_, SshState>,
    db_state: tauri::State<'_, DbState>,
) -> Result<SshActiveConnection, KodiqError> {
    let ssh_config = Arc::new(client::Config { ..Default::default() });

    let handler = KodiqSshHandler;
    let addr = format!("{}:{}", config.host, config.port);

    tracing::info!("SSH connecting to {} as {}", addr, config.username);

    // TCP connect + SSH handshake
    let mut handle = tokio::time::timeout(
        std::time::Duration::from_secs(15),
        client::connect(ssh_config, &addr, handler),
    )
    .await
    .map_err(|_| KodiqError::Ssh("Connection timeout (15s)".into()))?
    .map_err(|e| KodiqError::Ssh(format!("SSH handshake failed: {}", e)))?;

    // Authenticate
    let auth_ok = match &config.auth_method {
        AuthMethod::Password => {
            let pw = password
                .as_deref()
                .ok_or_else(|| KodiqError::Ssh("Password required for password auth".into()))?;
            handle
                .authenticate_password(&config.username, pw)
                .await
                .map_err(|e| KodiqError::Ssh(format!("Password auth failed: {}", e)))?
        }
        AuthMethod::Key => {
            let key_path = config.private_key_path.as_deref().unwrap_or("~/.ssh/id_rsa");
            let expanded = expand_tilde(key_path);

            let key_pair = if let Some(passphrase) = password.as_deref() {
                russh_keys::load_secret_key(&expanded, Some(passphrase))
            } else {
                russh_keys::load_secret_key(&expanded, None)
            }
            .map_err(|e| KodiqError::Ssh(format!("Failed to load key {}: {}", expanded, e)))?;

            handle
                .authenticate_publickey(&config.username, Arc::new(key_pair))
                .await
                .map_err(|e| KodiqError::Ssh(format!("Key auth failed: {}", e)))?
        }
        AuthMethod::Agent => {
            // Auto-detect: try common key files from ~/.ssh/
            let key_names = ["id_ed25519", "id_rsa", "id_ecdsa"];
            let home = std::env::var("HOME").unwrap_or_else(|_| "/root".to_string());
            let mut authed = false;

            for name in &key_names {
                let path = format!("{}/.ssh/{}", home, name);
                if !std::path::Path::new(&path).exists() {
                    continue;
                }
                if let Ok(kp) = russh_keys::load_secret_key(&path, None) {
                    if let Ok(true) =
                        handle.authenticate_publickey(&config.username, Arc::new(kp)).await
                    {
                        authed = true;
                        break;
                    }
                }
            }
            authed
        }
    };

    if !auth_ok {
        return Err(KodiqError::Ssh("Authentication failed".into()));
    }

    // Detect remote home directory
    let remote_home = detect_remote_home(&handle).await.ok();

    let now = chrono::Utc::now().timestamp();
    let conn = SshConnection {
        config: config.clone(),
        handle,
        status: ConnectionStatus::Connected,
        remote_home,
        connected_at: Some(now),
    };

    let active = conn.to_active();

    // Store in manager
    let mut manager = ssh_state.lock().await;
    manager.insert(conn);

    // Update DB stats
    {
        let db_conn = db_state.connection.lock().map_err(|_| KodiqError::LockPoisoned)?;
        let _ = db_conn.execute(
            "UPDATE ssh_connections SET last_connected = ?1, connect_count = connect_count + 1, updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, config.id],
        );
    }

    tracing::info!("SSH connected: {} ({})", config.name, config.host);
    Ok(active)
}

/// Disconnect from an SSH server.
#[tauri::command(async)]
pub async fn ssh_disconnect(
    connection_id: String,
    ssh_state: tauri::State<'_, SshState>,
) -> Result<(), KodiqError> {
    let mut manager = ssh_state.lock().await;
    if let Some(mut conn) = manager.remove(&connection_id) {
        conn.status = ConnectionStatus::Disconnected;
        // russh handle dropped → TCP connection closed
        tracing::info!("SSH disconnected: {}", connection_id);
        Ok(())
    } else {
        Err(KodiqError::ConnectionNotFound(connection_id))
    }
}

/// List all active SSH connections.
#[tauri::command(async)]
pub async fn ssh_list_connections(
    ssh_state: tauri::State<'_, SshState>,
) -> Result<Vec<SshActiveConnection>, KodiqError> {
    let manager = ssh_state.lock().await;
    Ok(manager.list_active())
}

/// Test SSH connectivity (connect + disconnect). Returns true on success.
#[tauri::command(async)]
pub async fn ssh_test_connection(
    config: SshConnectionConfig,
    password: Option<String>,
) -> Result<bool, KodiqError> {
    let ssh_config = Arc::new(client::Config::default());
    let handler = KodiqSshHandler;
    let addr = format!("{}:{}", config.host, config.port);

    let mut handle = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        client::connect(ssh_config, &addr, handler),
    )
    .await
    .map_err(|_| KodiqError::Ssh("Connection timeout".into()))?
    .map_err(|e| KodiqError::Ssh(format!("Connect failed: {}", e)))?;

    let auth_ok = match &config.auth_method {
        AuthMethod::Password => {
            let pw = password.as_deref().unwrap_or("");
            handle.authenticate_password(&config.username, pw).await.unwrap_or(false)
        }
        AuthMethod::Key => {
            let key_path = config.private_key_path.as_deref().unwrap_or("~/.ssh/id_rsa");
            let expanded = expand_tilde(key_path);
            match russh_keys::load_secret_key(&expanded, password.as_deref()) {
                Ok(kp) => handle
                    .authenticate_publickey(&config.username, Arc::new(kp))
                    .await
                    .unwrap_or(false),
                Err(_) => false,
            }
        }
        AuthMethod::Agent => {
            let key_names = ["id_ed25519", "id_rsa", "id_ecdsa"];
            let home = std::env::var("HOME").unwrap_or_else(|_| "/root".to_string());
            let mut ok = false;
            for name in &key_names {
                let path = format!("{}/.ssh/{}", home, name);
                if !std::path::Path::new(&path).exists() {
                    continue;
                }
                if let Ok(kp) = russh_keys::load_secret_key(&path, None) {
                    if handle
                        .authenticate_publickey(&config.username, Arc::new(kp))
                        .await
                        .unwrap_or(false)
                    {
                        ok = true;
                        break;
                    }
                }
            }
            ok
        }
    };

    Ok(auth_ok)
}

/// Get connection status by ID.
#[tauri::command(async)]
pub async fn ssh_connection_status(
    connection_id: String,
    ssh_state: tauri::State<'_, SshState>,
) -> Result<SshActiveConnection, KodiqError> {
    let manager = ssh_state.lock().await;
    match manager.get(&connection_id) {
        Some(conn) => Ok(conn.to_active()),
        None => Err(KodiqError::ConnectionNotFound(connection_id)),
    }
}

/// Detect remote home directory via `echo $HOME`.
async fn detect_remote_home(
    handle: &client::Handle<KodiqSshHandler>,
) -> Result<String, KodiqError> {
    let channel = handle
        .channel_open_session()
        .await
        .map_err(|e| KodiqError::Ssh(format!("Open channel: {}", e)))?;

    channel
        .exec(true, "echo $HOME")
        .await
        .map_err(|e| KodiqError::Ssh(format!("Exec echo: {}", e)))?;

    let mut output = String::new();
    let mut stream = channel.into_stream();

    use tokio::io::AsyncReadExt;
    let mut buf = [0u8; 256];
    match tokio::time::timeout(std::time::Duration::from_secs(5), stream.read(&mut buf)).await {
        Ok(Ok(n)) if n > 0 => {
            output = String::from_utf8_lossy(&buf[..n]).trim().to_string();
        }
        _ => {}
    }

    if output.is_empty() {
        Ok("/root".to_string())
    } else {
        Ok(output)
    }
}

/// Expand ~ to home directory
fn expand_tilde(path: &str) -> String {
    if path.starts_with('~') {
        if let Ok(home) = std::env::var("HOME") {
            return path.replacen('~', &home, 1);
        }
    }
    path.to_string()
}
