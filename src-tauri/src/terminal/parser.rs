/// Resolve command string to (program, args, label)
///
/// Maps known CLI names to their executables and provides
/// fallback to custom command splitting.
pub fn resolve_command(cmd: &str, custom_shell: Option<&str>) -> (String, Vec<String>, String) {
    match cmd.trim() {
        "" | "shell" | "zsh" | "bash" => {
            let shell =
                custom_shell.filter(|s| !s.is_empty()).map(String::from).unwrap_or_else(|| {
                    std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
                });
            let label = shell.split('/').next_back().unwrap_or("shell").to_string();
            (shell, vec![], label)
        }
        "gemini" => ("gemini".to_string(), vec![], "Gemini CLI".to_string()),
        "codex" => ("codex".to_string(), vec![], "Codex CLI".to_string()),
        "claude" => ("claude".to_string(), vec![], "Claude Code".to_string()),
        other => {
            let parts: Vec<String> = other.split_whitespace().map(String::from).collect();
            let program = parts.first().cloned().unwrap_or_default();
            let label = program.split('/').next_back().unwrap_or("custom").to_string();
            let args = parts.into_iter().skip(1).collect();
            (program, args, label)
        }
    }
}

/// Detect a localhost port from terminal output text.
/// Returns the first port >= 1024 found in the text.
#[cfg(test)]
fn detect_port(text: &str) -> Option<u16> {
    let url_re = regex::Regex::new(r"(?:https?://)?(?:localhost|127\.0\.0\.1):(\d{2,5})").unwrap();
    let ansi_re = regex::Regex::new(r"\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07").unwrap();
    let clean = ansi_re.replace_all(text, "").to_string();

    url_re.captures(&clean).and_then(|cap| {
        cap.get(1).and_then(|m| m.as_str().parse::<u16>().ok()).filter(|&p| p >= 1024)
    })
}

// ── Tests ─────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_shell_default() {
        let (prog, args, label) = resolve_command("", None);
        assert!(
            prog.contains("zsh") || prog.contains("bash") || prog.contains("sh"),
            "Expected shell, got: {}",
            prog
        );
        assert!(args.is_empty());
        assert!(!label.is_empty());
    }

    #[test]
    fn test_resolve_shell_explicit() {
        let (prog, args, _) = resolve_command("shell", None);
        assert!(prog.contains("sh"));
        assert!(args.is_empty());
    }

    #[test]
    fn test_resolve_claude() {
        let (prog, args, label) = resolve_command("claude", None);
        assert_eq!(prog, "claude");
        assert!(args.is_empty());
        assert_eq!(label, "Claude Code");
    }

    #[test]
    fn test_resolve_gemini() {
        let (prog, _, label) = resolve_command("gemini", None);
        assert_eq!(prog, "gemini");
        assert_eq!(label, "Gemini CLI");
    }

    #[test]
    fn test_resolve_custom_command() {
        let (prog, args, label) = resolve_command("python3 -i script.py", None);
        assert_eq!(prog, "python3");
        assert_eq!(args, vec!["-i", "script.py"]);
        assert_eq!(label, "python3");
    }

    #[test]
    fn test_resolve_custom_shell() {
        let (prog, _, _) = resolve_command("shell", Some("/bin/fish"));
        assert_eq!(prog, "/bin/fish");
    }

    #[test]
    fn test_detect_port_basic() {
        assert_eq!(detect_port("Server running at http://localhost:3000"), Some(3000));
    }

    #[test]
    fn test_detect_port_127() {
        assert_eq!(detect_port("Listening on http://127.0.0.1:5173/"), Some(5173));
    }

    #[test]
    fn test_detect_port_no_protocol() {
        assert_eq!(detect_port("Local:   localhost:4200"), Some(4200));
    }

    #[test]
    fn test_detect_port_with_ansi() {
        assert_eq!(detect_port("\x1b[32mReady at http://localhost:8080\x1b[0m"), Some(8080));
    }

    #[test]
    fn test_detect_port_none() {
        assert_eq!(detect_port("No server here"), None);
    }

    #[test]
    fn test_detect_port_low_port() {
        // Ports below 1024 should be ignored
        assert_eq!(detect_port("localhost:80"), None);
    }
}
