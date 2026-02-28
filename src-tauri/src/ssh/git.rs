use super::{ConnectionStatus, SshState};
use crate::error::KodiqError;
use tokio::io::AsyncReadExt;

/// Run a command on remote host via SSH exec channel and return stdout.
/// Note: SSH exec channels run through the remote shell by design — this is
/// fundamentally different from local child_process.exec(). The `command` is
/// constructed by Kodiq from trusted internal values (project path + git args),
/// not from untrusted user input. Path is shell-quoted for safety.
pub async fn ssh_run_command(
    ssh_state: &tauri::State<'_, SshState>,
    connection_id: &str,
    command: &str,
) -> Result<String, KodiqError> {
    let mut manager = ssh_state.lock().await;
    let conn = manager
        .get_mut(connection_id)
        .ok_or_else(|| KodiqError::ConnectionNotFound(connection_id.to_string()))?;

    if conn.status != ConnectionStatus::Connected {
        return Err(KodiqError::Ssh("Connection is not active".into()));
    }

    let channel = conn
        .handle
        .channel_open_session()
        .await
        .map_err(|e| KodiqError::Ssh(format!("Open channel: {}", e)))?;

    channel
        .exec(true, command)
        .await
        .map_err(|e| KodiqError::Ssh(format!("Remote exec: {}", e)))?;

    let mut stream = channel.into_stream();
    let mut output = Vec::new();
    let mut buf = [0u8; 8192];

    loop {
        match tokio::time::timeout(std::time::Duration::from_secs(10), stream.read(&mut buf)).await
        {
            Ok(Ok(0)) => break,
            Ok(Ok(n)) => output.extend_from_slice(&buf[..n]),
            Ok(Err(_)) => break,
            Err(_) => break, // timeout
        }
    }

    Ok(String::from_utf8_lossy(&output).trim().to_string())
}

/// Run a git command on remote host. Constructs: `cd '<path>' && git <args>`.
/// Path is shell-quoted to prevent injection.
pub async fn ssh_git_run(
    ssh_state: &tauri::State<'_, SshState>,
    connection_id: &str,
    path: &str,
    git_args: &str,
) -> Result<String, KodiqError> {
    let command = format!("cd {} && git {}", shell_quote(path), git_args);
    ssh_run_command(ssh_state, connection_id, &command).await
}

/// Run a git command, return None on failure.
pub async fn ssh_git_try(
    ssh_state: &tauri::State<'_, SshState>,
    connection_id: &str,
    path: &str,
    git_args: &str,
) -> Option<String> {
    ssh_git_run(ssh_state, connection_id, path, git_args).await.ok()
}

/// Shell-quote a string with single quotes (POSIX-safe).
fn shell_quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}
