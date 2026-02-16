/// Detect user's default shell.
/// - macOS/Linux: reads $SHELL, then checks common paths.
/// - Windows: reads COMSPEC, then tries powershell / cmd.
#[tauri::command]
pub fn detect_default_shell() -> String {
    if cfg!(target_os = "windows") {
        // 1. Try COMSPEC (usually C:\Windows\system32\cmd.exe)
        if let Ok(comspec) = std::env::var("COMSPEC") {
            if !comspec.is_empty() {
                return comspec;
            }
        }

        // 2. Try PowerShell
        let ps_candidates = ["pwsh.exe", "powershell.exe"];
        for ps in &ps_candidates {
            if std::process::Command::new(ps)
                .arg("--version")
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
            {
                return ps.to_string();
            }
        }

        // 3. Last resort
        "cmd.exe".to_string()
    } else {
        // 1. Try $SHELL env var
        if let Ok(shell) = std::env::var("SHELL") {
            if !shell.is_empty() {
                return shell;
            }
        }

        // 2. Fallback: check common shells
        let candidates = ["/bin/zsh", "/bin/bash", "/bin/fish", "/bin/sh"];
        for candidate in &candidates {
            if std::path::Path::new(candidate).exists() {
                return candidate.to_string();
            }
        }

        // 3. Last resort
        "/bin/sh".to_string()
    }
}

/// Detect which AI CLI tools are installed on the system.
/// Checks for: Claude Code, Gemini CLI, Codex, Aider, Ollama.
/// Uses `where` on Windows, `which` on Unix.
#[tauri::command]
pub fn detect_cli_tools() -> Vec<serde_json::Value> {
    let tools = vec![
        ("claude", "Claude Code", "anthropic"),
        ("gemini", "Gemini CLI", "google"),
        ("codex", "Codex CLI", "openai"),
        ("aider", "Aider", "aider"),
        ("ollama", "Ollama", "ollama"),
    ];

    let which_cmd = if cfg!(target_os = "windows") { "where" } else { "which" };

    tools
        .into_iter()
        .map(|(bin, name, provider)| {
            let installed = std::process::Command::new(which_cmd)
                .arg(bin)
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false);

            let version = if installed {
                std::process::Command::new(bin)
                    .arg("--version")
                    .output()
                    .ok()
                    .and_then(|o| {
                        String::from_utf8(o.stdout)
                            .ok()
                            .map(|s| s.trim().to_string())
                    })
                    .unwrap_or_default()
            } else {
                String::new()
            };

            serde_json::json!({
                "bin": bin,
                "name": name,
                "provider": provider,
                "installed": installed,
                "version": version,
            })
        })
        .collect()
}
