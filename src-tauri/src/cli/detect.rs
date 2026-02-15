/// Detect which AI CLI tools are installed on the system.
/// Checks for: Claude Code, Gemini CLI, Codex, Aider, Ollama.
#[tauri::command]
pub fn detect_cli_tools() -> Vec<serde_json::Value> {
    let tools = vec![
        ("claude", "Claude Code", "anthropic"),
        ("gemini", "Gemini CLI", "google"),
        ("codex", "Codex CLI", "openai"),
        ("aider", "Aider", "aider"),
        ("ollama", "Ollama", "ollama"),
    ];

    tools
        .into_iter()
        .map(|(bin, name, provider)| {
            let installed = std::process::Command::new("which")
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
