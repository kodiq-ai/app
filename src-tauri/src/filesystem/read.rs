/// Read directory contents for file tree.
/// Sorts directories first, then alphabetically by name.
/// Skips hidden files and common noise directories.
#[tauri::command]
pub fn read_dir(path: String) -> Result<Vec<serde_json::Value>, String> {
    let dir = std::path::Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let mut entries: Vec<serde_json::Value> = Vec::new();

    let mut items: Vec<_> = std::fs::read_dir(dir)
        .map_err(|e| format!("Failed to read dir: {}", e))?
        .filter_map(|e| e.ok())
        .collect();

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

        let file_type = entry.file_type().unwrap();
        let full_path = entry.path().to_string_lossy().to_string();

        entries.push(serde_json::json!({
            "name": name,
            "path": full_path,
            "isDir": file_type.is_dir(),
        }));
    }

    Ok(entries)
}

/// Read a file's content as string (up to 1MB, for file viewer)
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let file_path = std::path::Path::new(&path);
    if !file_path.is_file() {
        return Err(format!("Not a file: {}", path));
    }
    let metadata =
        std::fs::metadata(&path).map_err(|e| format!("Cannot read metadata: {}", e))?;
    if metadata.len() > 1_048_576 {
        return Err("File too large (>1MB)".to_string());
    }
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}
