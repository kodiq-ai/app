use crate::error::KodiqError;
use crate::ssh::{self, SshState};

/// Write content to a file (create or overwrite).
/// Used by the editor save action (Cmd+S).
/// If `connection_id` is provided, writes to remote via SFTP.
#[tracing::instrument(skip(content, ssh_state))]
#[tauri::command(async)]
pub async fn write_file(
    path: String,
    content: String,
    connection_id: Option<String>,
    ssh_state: tauri::State<'_, SshState>,
) -> Result<(), KodiqError> {
    // Remote: delegate to SFTP
    if let Some(ref conn_id) = connection_id {
        return ssh::filesystem::sftp_write_file(&path, &content, &ssh_state, conn_id).await;
    }

    // Local: original logic
    let file_path = std::path::Path::new(&path);

    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            return Err(KodiqError::NotFound(format!(
                "Parent directory does not exist: {}",
                parent.display()
            )));
        }
    }

    std::fs::write(&path, &content)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_write_and_read_back() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.txt").to_string_lossy().to_string();

        write_file(path.clone(), "hello world".to_string()).unwrap();

        let content = fs::read_to_string(&path).unwrap();
        assert_eq!(content, "hello world");
    }

    #[test]
    fn test_write_overwrites_existing() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.txt").to_string_lossy().to_string();

        write_file(path.clone(), "first".to_string()).unwrap();
        write_file(path.clone(), "second".to_string()).unwrap();

        let content = fs::read_to_string(&path).unwrap();
        assert_eq!(content, "second");
    }

    #[test]
    fn test_write_nonexistent_parent() {
        let result = write_file("/nonexistent/dir/file.txt".to_string(), "data".to_string());
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("Parent directory does not exist"));
    }
}
