use crate::error::KodiqError;
use notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebouncedEvent, Debouncer};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Emitter;

// ── State ────────────────────────────────────────────────────────────

type NotifyDebouncer = Debouncer<notify::RecommendedWatcher>;

pub struct WatcherState {
    debouncer: Mutex<Option<NotifyDebouncer>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self { debouncer: Mutex::new(None) }
    }
}

// ── Helpers ──────────────────────────────────────────────────────────

/// Directories that should NOT trigger fs-changed events.
/// Changes inside these are noise — build artifacts, caches, etc.
const IGNORED_DIRS: &[&str] = &[
    "node_modules",
    "target",
    ".git",
    "__pycache__",
    ".next",
    "dist",
    "build",
    ".turbo",
    ".cache",
    "venv",
    ".venv",
];

fn is_ignored(path: &std::path::Path) -> bool {
    path.components().any(|c| {
        if let std::path::Component::Normal(name) = c {
            if let Some(s) = name.to_str() {
                return IGNORED_DIRS.contains(&s);
            }
        }
        false
    })
}

fn is_git_event(path: &std::path::Path) -> bool {
    path.components().any(|c| {
        if let std::path::Component::Normal(name) = c {
            return name == ".git";
        }
        false
    })
}

// ── Core logic ───────────────────────────────────────────────────────

fn start(app: tauri::AppHandle, root: &str, state: &WatcherState) -> Result<(), KodiqError> {
    let root_path = PathBuf::from(root);
    let root_clone = root_path.clone();

    // Create a debouncer with 500ms window — batches rapid FS events
    let debouncer = new_debouncer(
        Duration::from_millis(500),
        move |result: Result<Vec<DebouncedEvent>, notify::Error>| {
            let events = match result {
                Ok(events) => events,
                Err(e) => {
                    tracing::warn!("Watcher error: {}", e);
                    return;
                }
            };

            let mut has_fs = false;
            let mut has_git = false;

            for event in &events {
                if is_git_event(&event.path) {
                    has_git = true;
                } else if !is_ignored(&event.path) {
                    has_fs = true;
                }
            }

            if has_fs {
                let _ = app.emit("fs-changed", root_clone.to_string_lossy().to_string());
            }
            if has_git {
                let _ = app.emit("git-changed", root_clone.to_string_lossy().to_string());
            }
        },
    )?;

    // Store debouncer, replacing any previous one (auto-drops old watcher)
    let mut guard = state.debouncer.lock()?;
    *guard = Some(debouncer);

    // Start watching the project root recursively
    if let Some(ref mut d) = *guard {
        d.watcher().watch(root_path.as_ref(), RecursiveMode::Recursive)?;
    }

    tracing::info!("File watcher started for: {}", root);
    Ok(())
}

fn stop(state: &WatcherState) -> Result<(), KodiqError> {
    let mut guard = state.debouncer.lock()?;
    if guard.is_some() {
        *guard = None; // Drop stops the watcher
        tracing::info!("File watcher stopped");
    }
    Ok(())
}

// ── Tauri Commands ───────────────────────────────────────────────────

#[tauri::command]
pub fn start_watching(
    app: tauri::AppHandle,
    path: String,
    watcher: tauri::State<WatcherState>,
) -> Result<(), KodiqError> {
    start(app, &path, &watcher)
}

#[tauri::command]
pub fn stop_watching(watcher: tauri::State<WatcherState>) -> Result<(), KodiqError> {
    stop(&watcher)
}

// ── Tests ────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_ignored() {
        assert!(is_ignored(std::path::Path::new("/project/node_modules/pkg/index.js")));
        assert!(is_ignored(std::path::Path::new("/project/target/debug/app")));
        assert!(is_ignored(std::path::Path::new("/project/__pycache__/mod.pyc")));
        assert!(!is_ignored(std::path::Path::new("/project/src/main.rs")));
        assert!(!is_ignored(std::path::Path::new("/project/package.json")));
    }

    #[test]
    fn test_is_git_event() {
        assert!(is_git_event(std::path::Path::new("/project/.git/HEAD")));
        assert!(is_git_event(std::path::Path::new("/project/.git/refs/heads/main")));
        assert!(!is_git_event(std::path::Path::new("/project/src/main.rs")));
        assert!(!is_git_event(std::path::Path::new("/project/.gitignore")));
    }
}
