use crate::error::KodiqError;
use crate::ssh::{self, SshState};

/// Read directory contents for file tree.
/// If `connection_id` is provided, reads from remote via SFTP.
/// Sorts directories first, then alphabetically by name.
/// Skips hidden files and common noise directories.
#[tracing::instrument(skip(ssh_state))]
#[tauri::command(async)]
pub async fn read_dir(
    path: String,
    connection_id: Option<String>,
    ssh_state: tauri::State<'_, SshState>,
) -> Result<Vec<serde_json::Value>, KodiqError> {
    // Remote: delegate to SFTP
    if let Some(ref conn_id) = connection_id {
        return ssh::filesystem::sftp_read_dir(&path, &ssh_state, conn_id).await;
    }

    // Local: original logic
    let dir = std::path::Path::new(&path);
    if !dir.is_dir() {
        return Err(KodiqError::NotFound(format!("Not a directory: {}", path)));
    }

    let mut entries: Vec<serde_json::Value> = Vec::new();

    let mut items: Vec<_> = std::fs::read_dir(dir)?.filter_map(|e| e.ok()).collect();

    // Sort: directories first, then by name
    items.sort_by(|a, b| {
        let a_dir = a.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let b_dir = b.file_type().map(|t| t.is_dir()).unwrap_or(false);
        match (a_dir, b_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.file_name().cmp(&b.file_name()),
        }
    });

    for entry in items {
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and common noise
        if name.starts_with('.')
            || name == "node_modules"
            || name == "target"
            || name == "__pycache__"
            || name == ".git"
        {
            continue;
        }

        let Ok(file_type) = entry.file_type() else {
            continue; // skip broken symlinks / inaccessible entries
        };
        let full_path = entry.path().to_string_lossy().to_string();

        entries.push(serde_json::json!({
            "name": name,
            "path": full_path,
            "isDir": file_type.is_dir(),
        }));
    }

    Ok(entries)
}

/// Read a file's content as string (up to 1MB, for file viewer).
/// If `connection_id` is provided, reads from remote via SFTP.
#[tracing::instrument(skip(ssh_state))]
#[tauri::command(async)]
pub async fn read_file(
    path: String,
    connection_id: Option<String>,
    ssh_state: tauri::State<'_, SshState>,
) -> Result<String, KodiqError> {
    // Remote: delegate to SFTP
    if let Some(ref conn_id) = connection_id {
        return ssh::filesystem::sftp_read_file(&path, &ssh_state, conn_id).await;
    }

    // Local: original logic
    let file_path = std::path::Path::new(&path);
    if !file_path.is_file() {
        return Err(KodiqError::NotFound(format!("Not a file: {}", path)));
    }
    let metadata = std::fs::metadata(&path)?;
    if metadata.len() > 1_048_576 {
        return Err(KodiqError::Other("File too large (>1MB)".to_string()));
    }
    Ok(std::fs::read_to_string(&path)?)
}
