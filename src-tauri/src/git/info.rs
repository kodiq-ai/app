use std::collections::{HashMap, HashSet};

use crate::error::KodiqError;

/// Get project statistics: file counts by extension, total size, detected stack
#[tauri::command]
pub fn get_project_stats(path: String) -> Result<serde_json::Value, KodiqError> {
    let root = std::path::Path::new(&path);
    if !root.is_dir() {
        return Err(KodiqError::NotFound(format!("Not a directory: {}", path)));
    }

    let skip_dirs: HashSet<&str> = [
        "node_modules",
        "target",
        ".git",
        "__pycache__",
        ".next",
        "dist",
        "build",
        ".turbo",
        ".cache",
        "vendor",
        "venv",
        ".venv",
    ]
    .iter()
    .copied()
    .collect();

    let mut ext_counts: HashMap<String, u32> = HashMap::new();
    let mut total_files: u32 = 0;
    let mut total_dirs: u32 = 0;
    let mut total_size: u64 = 0;
    let mut stack: Vec<String> = Vec::new();

    #[allow(clippy::too_many_arguments)]
    fn walk(
        dir: &std::path::Path,
        skip: &HashSet<&str>,
        ext_counts: &mut HashMap<String, u32>,
        total_files: &mut u32,
        total_dirs: &mut u32,
        total_size: &mut u64,
        stack: &mut Vec<String>,
        depth: u32,
    ) {
        if depth > 10 {
            return;
        }
        let Ok(entries) = std::fs::read_dir(dir) else {
            return;
        };
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            let Ok(ft) = entry.file_type() else {
                continue;
            };
            if ft.is_dir() {
                if skip.contains(name.as_str()) {
                    continue;
                }
                *total_dirs += 1;
                walk(
                    &entry.path(),
                    skip,
                    ext_counts,
                    total_files,
                    total_dirs,
                    total_size,
                    stack,
                    depth + 1,
                );
            } else if ft.is_file() {
                *total_files += 1;
                if let Ok(meta) = entry.metadata() {
                    *total_size += meta.len();
                }
                if depth == 0 {
                    match name.as_str() {
                        "package.json" => stack.push("Node.js".into()),
                        "Cargo.toml" => stack.push("Rust".into()),
                        "go.mod" => stack.push("Go".into()),
                        "pyproject.toml" | "requirements.txt" => stack.push("Python".into()),
                        "tsconfig.json" => stack.push("TypeScript".into()),
                        "vite.config.ts" | "vite.config.js" => stack.push("Vite".into()),
                        "next.config.js" | "next.config.ts" | "next.config.mjs" => {
                            stack.push("Next.js".into())
                        }
                        "tauri.conf.json" => stack.push("Tauri".into()),
                        _ => {}
                    }
                }
                if let Some(ext) = entry.path().extension().and_then(|e| e.to_str()) {
                    *ext_counts.entry(ext.to_lowercase()).or_insert(0) += 1;
                }
            }
        }
    }

    walk(
        root,
        &skip_dirs,
        &mut ext_counts,
        &mut total_files,
        &mut total_dirs,
        &mut total_size,
        &mut stack,
        0,
    );

    let mut ext_vec: Vec<_> = ext_counts.into_iter().collect();
    ext_vec.sort_by(|a, b| b.1.cmp(&a.1));
    ext_vec.truncate(10);
    stack.sort();
    stack.dedup();

    Ok(serde_json::json!({
        "totalFiles": total_files,
        "totalDirs": total_dirs,
        "totalSizeBytes": total_size,
        "extensions": ext_vec.into_iter()
            .map(|(ext, count)| serde_json::json!({ "ext": ext, "count": count }))
            .collect::<Vec<_>>(),
        "stack": stack,
    }))
}

/// Get git info for a project: branch, status, changed files
#[tracing::instrument]
#[tauri::command]
pub fn get_git_info(path: String) -> Result<serde_json::Value, KodiqError> {
    use std::process::Command;

    let run = |args: &[&str]| -> Option<String> {
        Command::new("git")
            .args(args)
            .current_dir(&path)
            .output()
            .ok()
            .filter(|o| o.status.success())
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .map(|s| s.trim().to_string())
    };

    let is_git = run(&["rev-parse", "--is-inside-work-tree"]).map(|s| s == "true").unwrap_or(false);
    if !is_git {
        return Ok(serde_json::json!({ "isGit": false }));
    }

    let branch = run(&["branch", "--show-current"]).unwrap_or_default();
    let commit_hash = run(&["rev-parse", "--short", "HEAD"]).unwrap_or_default();
    let commit_message = run(&["log", "-1", "--pretty=%s"]).unwrap_or_default();
    let commit_time = run(&["log", "-1", "--pretty=%cr"]).unwrap_or_default();

    let status_raw = run(&["status", "--porcelain"]).unwrap_or_default();
    let changed_files: Vec<serde_json::Value> = status_raw
        .lines()
        .filter(|l| !l.is_empty())
        .take(50)
        .map(|line| {
            let status = line.get(0..2).unwrap_or("??").trim().to_string();
            let file = line.get(3..).unwrap_or("").to_string();
            let kind = match status.as_str() {
                "M" | " M" | "MM" => "modified",
                "A" | " A" => "added",
                "D" | " D" => "deleted",
                "R" | " R" => "renamed",
                "??" => "untracked",
                _ => "other",
            };
            serde_json::json!({ "file": file, "status": status, "kind": kind })
        })
        .collect();

    let ahead_behind =
        run(&["rev-list", "--left-right", "--count", "HEAD...@{upstream}"]).unwrap_or_default();
    let (ahead, behind) = {
        let parts: Vec<&str> = ahead_behind.split('\t').collect();
        (
            parts.first().and_then(|s| s.parse::<u32>().ok()).unwrap_or(0),
            parts.get(1).and_then(|s| s.parse::<u32>().ok()).unwrap_or(0),
        )
    };

    Ok(serde_json::json!({
        "isGit": true,
        "branch": branch,
        "commitHash": commit_hash,
        "commitMessage": commit_message,
        "commitTime": commit_time,
        "changedFiles": changed_files,
        "changedCount": changed_files.len(),
        "ahead": ahead,
        "behind": behind,
    }))
}
