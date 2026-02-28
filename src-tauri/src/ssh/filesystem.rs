use super::{ConnectionStatus, SshState};
use crate::error::KodiqError;
use russh_sftp::client::SftpSession;
use serde_json::json;

/// Create a new SFTP session for a connection.
/// Each call opens a new SFTP subsystem channel (lightweight).
/// Lock is released before any network I/O to avoid deadlocking concurrent operations.
async fn create_sftp(
    ssh_state: &tauri::State<'_, SshState>,
    connection_id: &str,
) -> Result<SftpSession, KodiqError> {
    // Clone handle inside a tight lock scope — never hold lock across await
    let handle = {
        let manager = ssh_state.lock().await;
        let conn = manager
            .get(connection_id)
            .ok_or_else(|| KodiqError::ConnectionNotFound(connection_id.to_string()))?;

        if conn.status != ConnectionStatus::Connected {
            return Err(KodiqError::Ssh("Connection is not active".into()));
        }

        conn.handle.clone()
    }; // lock released here

    let channel = handle
        .channel_open_session()
        .await
        .map_err(|e| KodiqError::Sftp(format!("Open SFTP channel: {}", e)))?;

    channel
        .request_subsystem(true, "sftp")
        .await
        .map_err(|e| KodiqError::Sftp(format!("Request SFTP subsystem: {}", e)))?;

    SftpSession::new(channel.into_stream())
        .await
        .map_err(|e| KodiqError::Sftp(format!("Init SFTP session: {}", e)))
}

/// Read remote directory via SFTP.
pub async fn sftp_read_dir(
    path: &str,
    ssh_state: &tauri::State<'_, SshState>,
    connection_id: &str,
) -> Result<Vec<serde_json::Value>, KodiqError> {
    let sftp = create_sftp(ssh_state, connection_id).await?;

    let entries = sftp
        .read_dir(path)
        .await
        .map_err(|e| KodiqError::Sftp(format!("Read dir {}: {}", path, e)))?;

    let skip = ["node_modules", "target", "__pycache__", ".git"];

    let mut items: Vec<_> = entries
        .into_iter()
        .filter(|e| {
            let name = e.file_name();
            !name.starts_with('.') && !skip.contains(&name.as_str())
        })
        .collect();

    items.sort_by(|a, b| {
        let a_dir = a.file_type().is_dir();
        let b_dir = b.file_type().is_dir();
        match (a_dir, b_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.file_name().cmp(&b.file_name()),
        }
    });

    let mut result: Vec<serde_json::Value> = Vec::new();
    for entry in items {
        let name = entry.file_name();
        let is_dir = entry.file_type().is_dir();
        let full_path = if path.ends_with('/') {
            format!("{}{}", path, name)
        } else {
            format!("{}/{}", path, name)
        };

        result.push(json!({
            "name": name,
            "path": full_path,
            "isDir": is_dir,
        }));
    }

    Ok(result)
}

/// Read remote file via SFTP (up to 1MB).
pub async fn sftp_read_file(
    path: &str,
    ssh_state: &tauri::State<'_, SshState>,
    connection_id: &str,
) -> Result<String, KodiqError> {
    let sftp = create_sftp(ssh_state, connection_id).await?;

    let metadata =
        sftp.metadata(path).await.map_err(|e| KodiqError::Sftp(format!("Stat {}: {}", path, e)))?;

    if let Some(size) = metadata.size {
        if size > 1_048_576 {
            return Err(KodiqError::Other("File too large (>1MB)".to_string()));
        }
    }

    use tokio::io::AsyncReadExt;
    let mut file =
        sftp.open(path).await.map_err(|e| KodiqError::Sftp(format!("Open {}: {}", path, e)))?;

    let mut content = Vec::new();
    file.read_to_end(&mut content)
        .await
        .map_err(|e| KodiqError::Sftp(format!("Read {}: {}", path, e)))?;

    String::from_utf8(content).map_err(|_| KodiqError::Other("File is not valid UTF-8".to_string()))
}

/// Write remote file via SFTP.
pub async fn sftp_write_file(
    path: &str,
    content: &str,
    ssh_state: &tauri::State<'_, SshState>,
    connection_id: &str,
) -> Result<(), KodiqError> {
    let sftp = create_sftp(ssh_state, connection_id).await?;

    use tokio::io::AsyncWriteExt;
    let mut file =
        sftp.create(path).await.map_err(|e| KodiqError::Sftp(format!("Create {}: {}", path, e)))?;

    file.write_all(content.as_bytes())
        .await
        .map_err(|e| KodiqError::Sftp(format!("Write {}: {}", path, e)))?;

    file.shutdown().await.map_err(|e| KodiqError::Sftp(format!("Close {}: {}", path, e)))?;

    Ok(())
}
