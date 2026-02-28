use std::collections::{HashMap, HashSet};
use std::process::Command;

use crate::error::KodiqError;
use crate::ssh::{self, SshState};

// ── Git helpers ──────────────────────────────────────────────────────────────

/// Run a git command in the given directory, return stdout on success
fn git_run(path: &str, args: &[&str]) -> Result<String, KodiqError> {
    let output = Command::new("git")
        .args(args)
        .current_dir(path)
        .output()
        .map_err(|e| KodiqError::Other(format!("Failed to run git: {}", e)))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(KodiqError::Other(format!("git error: {}", stderr)));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Run a git command, return None on failure instead of error
fn git_try(path: &str, args: &[&str]) -> Option<String> {
    Command::new("git")
        .args(args)
        .current_dir(path)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
}

// ── Stage / Unstage ──────────────────────────────────────────────────────────

#[tauri::command(async)]
pub async fn git_stage(
    path: String,
    files: Vec<String>,
    connection_id: Option<String>,
    ssh_state: tauri::State<'_, SshState>,
) -> Result<(), KodiqError> {
    if files.is_empty() {
        return Ok(());
    }

    if let Some(ref conn_id) = connection_id {
        let quoted: Vec<String> = files.iter().map(|f| ssh::git::shell_quote(f)).collect();
        ssh::git::ssh_git_run(&ssh_state, conn_id, &path, &format!("add -- {}", quoted.join(" ")))
            .await?;
        return Ok(());
    }

    let mut args = vec!["add", "--"];
    let refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(refs);
    git_run(&path, &args)?;
    Ok(())
}

#[tauri::command(async)]
pub async fn git_unstage(
    path: String,
    files: Vec<String>,
    connection_id: Option<String>,
    ssh_state: tauri::State<'_, SshState>,
) -> Result<(), KodiqError> {
    if files.is_empty() {
        return Ok(());
    }

    if let Some(ref conn_id) = connection_id {
        let quoted: Vec<String> = files.iter().map(|f| ssh::git::shell_quote(f)).collect();
        ssh::git::ssh_git_run(
            &ssh_state,
            conn_id,
            &path,
            &format!("reset HEAD -- {}", quoted.join(" ")),
        )
        .await?;
        return Ok(());
    }

    let mut args = vec!["reset", "HEAD", "--"];
    let refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(refs);
    git_run(&path, &args)?;
    Ok(())
}

#[tauri::command(async)]
pub async fn git_stage_all(
    path: String,
    connection_id: Option<String>,
    ssh_state: tauri::State<'_, SshState>,
) -> Result<(), KodiqError> {
    if let Some(ref conn_id) = connection_id {
        ssh::git::ssh_git_run(&ssh_state, conn_id, &path, "add -A").await?;
        return Ok(());
    }
    git_run(&path, &["add", "-A"])?;
    Ok(())
}

#[tauri::command(async)]
pub async fn git_unstage_all(
    path: String,
    connection_id: Option<String>,
    ssh_state: tauri::State<'_, SshState>,
) -> Result<(), KodiqError> {
    if let Some(ref conn_id) = connection_id {
        ssh::git::ssh_git_run(&ssh_state, conn_id, &path, "reset HEAD").await?;
        return Ok(());
    }
    git_run(&path, &["reset", "HEAD"])?;
    Ok(())
}

// ── Commit ───────────────────────────────────────────────────────────────────

#[tauri::command(async)]
pub async fn git_commit(
    path: String,
    message: String,
    connection_id: Option<String>,
    ssh_state: tauri::State<'_, SshState>,
) -> Result<serde_json::Value, KodiqError> {
    if message.trim().is_empty() {
        return Err(KodiqError::Other("Commit message cannot be empty".into()));
    }

    if let Some(ref conn_id) = connection_id {
        // Shell-escape the message for remote exec
        let escaped = message.replace('\'', "'\\''");
        ssh::git::ssh_git_run(&ssh_state, conn_id, &path, &format!("commit -m '{}'", escaped))
            .await?;
        let hash = ssh::git::ssh_git_try(&ssh_state, conn_id, &path, "rev-parse --short HEAD")
            .await
            .unwrap_or_default();
        return Ok(serde_json::json!({ "hash": hash, "message": message }));
    }

    git_run(&path, &["commit", "-m", &message])?;
    let hash = git_try(&path, &["rev-parse", "--short", "HEAD"]).unwrap_or_default();
    Ok(serde_json::json!({ "hash": hash, "message": message }))
}

// ── Diff ─────────────────────────────────────────────────────────────────────

#[tauri::command(async)]
pub async fn git_diff(
    path: String,
    file: String,
    staged: bool,
    connection_id: Option<String>,
    ssh_state: tauri::State<'_, SshState>,
) -> Result<String, KodiqError> {
    if let Some(ref conn_id) = connection_id {
        let quoted_file = ssh::git::shell_quote(&file);
        let args = if staged {
            format!("diff --cached -- {}", quoted_file)
        } else {
            format!("diff -- {}", quoted_file)
        };
        return ssh::git::ssh_git_run(&ssh_state, conn_id, &path, &args).await;
    }

    let args =
        if staged { vec!["diff", "--cached", "--", &file] } else { vec!["diff", "--", &file] };
    git_run(&path, &args)
}

/// Get project statistics: file counts by extension, total size, detected stack
/// Note: remote project stats are not yet supported (returns error).
#[tauri::command(async)]
pub async fn get_project_stats(
    path: String,
    connection_id: Option<String>,
    _ssh_state: tauri::State<'_, SshState>,
) -> Result<serde_json::Value, KodiqError> {
    if connection_id.is_some() {
        // Remote stats via SFTP walk would be very slow.
        // Return a minimal placeholder; Phase 6 will add full remote stats.
        return Ok(serde_json::json!({
            "totalFiles": 0,
            "totalDirs": 0,
            "totalSizeBytes": 0,
            "extensions": [],
            "stack": [],
        }));
    }

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

/// Classify a single porcelain status character into a kind string
fn status_kind(ch: char) -> &'static str {
    match ch {
        'M' => "modified",
        'A' => "added",
        'D' => "deleted",
        'R' => "renamed",
        'C' => "copied",
        '?' => "untracked",
        _ => "other",
    }
}

/// Parse git status --porcelain output into (staged, unstaged, changed) file lists.
/// Shared between local and remote paths.
fn parse_status_porcelain(
    status_raw: &str,
) -> (Vec<serde_json::Value>, Vec<serde_json::Value>, Vec<serde_json::Value>) {
    let mut staged_files: Vec<serde_json::Value> = Vec::new();
    let mut unstaged_files: Vec<serde_json::Value> = Vec::new();
    let mut changed_files: Vec<serde_json::Value> = Vec::new();

    for line in status_raw.lines().filter(|l| l.len() >= 3) {
        let bytes = line.as_bytes();
        let x = bytes[0] as char;
        let y = bytes[1] as char;
        let file = line[3..].to_string();

        if x == '?' && y == '?' {
            unstaged_files.push(serde_json::json!({ "file": file, "kind": "untracked" }));
            changed_files
                .push(serde_json::json!({ "file": file, "status": "??", "kind": "untracked" }));
            continue;
        }

        if x != ' ' && x != '?' {
            staged_files.push(serde_json::json!({ "file": file, "kind": status_kind(x) }));
        }

        if y != ' ' && y != '?' {
            unstaged_files.push(serde_json::json!({ "file": file, "kind": status_kind(y) }));
        }

        let kind = if x != ' ' && x != '?' { status_kind(x) } else { status_kind(y) };
        changed_files.push(
            serde_json::json!({ "file": file, "status": format!("{}{}", x, y), "kind": kind }),
        );
    }

    (staged_files, unstaged_files, changed_files)
}

/// Get git info for a project: branch, status, staged/unstaged files.
/// If `connection_id` is provided, runs git on remote host via SSH exec.
#[tracing::instrument(skip(ssh_state))]
#[tauri::command(async)]
pub async fn get_git_info(
    path: String,
    connection_id: Option<String>,
    ssh_state: tauri::State<'_, SshState>,
) -> Result<serde_json::Value, KodiqError> {
    // ── Remote: git via SSH exec ────────────────────────────────────────
    if let Some(ref conn_id) = connection_id {
        let is_git =
            ssh::git::ssh_git_try(&ssh_state, conn_id, &path, "rev-parse --is-inside-work-tree")
                .await
                .map(|s| s == "true")
                .unwrap_or(false);

        if !is_git {
            return Ok(serde_json::json!({ "isGit": false }));
        }

        let branch = ssh::git::ssh_git_try(&ssh_state, conn_id, &path, "branch --show-current")
            .await
            .unwrap_or_default();
        let commit_hash =
            ssh::git::ssh_git_try(&ssh_state, conn_id, &path, "rev-parse --short HEAD")
                .await
                .unwrap_or_default();
        let commit_message =
            ssh::git::ssh_git_try(&ssh_state, conn_id, &path, "log -1 --pretty=%s")
                .await
                .unwrap_or_default();
        let commit_time = ssh::git::ssh_git_try(&ssh_state, conn_id, &path, "log -1 --pretty=%cr")
            .await
            .unwrap_or_default();

        let status_raw = ssh::git::ssh_git_try(&ssh_state, conn_id, &path, "status --porcelain")
            .await
            .unwrap_or_default();
        let (staged_files, unstaged_files, changed_files) = parse_status_porcelain(&status_raw);

        let ahead_behind = ssh::git::ssh_git_try(
            &ssh_state,
            conn_id,
            &path,
            "rev-list --left-right --count HEAD...@{upstream}",
        )
        .await
        .unwrap_or_default();
        let (ahead, behind) = {
            let parts: Vec<&str> = ahead_behind.split('\t').collect();
            (
                parts.first().and_then(|s| s.parse::<u32>().ok()).unwrap_or(0),
                parts.get(1).and_then(|s| s.parse::<u32>().ok()).unwrap_or(0),
            )
        };

        return Ok(serde_json::json!({
            "isGit": true,
            "branch": branch,
            "commitHash": commit_hash,
            "commitMessage": commit_message,
            "commitTime": commit_time,
            "changedFiles": changed_files,
            "changedCount": changed_files.len(),
            "stagedFiles": staged_files,
            "stagedCount": staged_files.len(),
            "unstagedFiles": unstaged_files,
            "unstagedCount": unstaged_files.len(),
            "ahead": ahead,
            "behind": behind,
        }));
    }

    // ── Local: original logic ───────────────────────────────────────────
    let is_git = git_try(&path, &["rev-parse", "--is-inside-work-tree"])
        .map(|s| s == "true")
        .unwrap_or(false);
    if !is_git {
        return Ok(serde_json::json!({ "isGit": false }));
    }

    let branch = git_try(&path, &["branch", "--show-current"]).unwrap_or_default();
    let commit_hash = git_try(&path, &["rev-parse", "--short", "HEAD"]).unwrap_or_default();
    let commit_message = git_try(&path, &["log", "-1", "--pretty=%s"]).unwrap_or_default();
    let commit_time = git_try(&path, &["log", "-1", "--pretty=%cr"]).unwrap_or_default();

    let status_raw = git_try(&path, &["status", "--porcelain"]).unwrap_or_default();
    let (staged_files, unstaged_files, changed_files) = parse_status_porcelain(&status_raw);

    let ahead_behind =
        git_try(&path, &["rev-list", "--left-right", "--count", "HEAD...@{upstream}"])
            .unwrap_or_default();
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
        "stagedFiles": staged_files,
        "stagedCount": staged_files.len(),
        "unstagedFiles": unstaged_files,
        "unstagedCount": unstaged_files.len(),
        "ahead": ahead,
        "behind": behind,
    }))
}
