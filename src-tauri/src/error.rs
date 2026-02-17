// ── Kodiq Error Types ──────────────────────────────────────────────────────
//
// Typed errors using thiserror. All Tauri commands return Result<T, KodiqError>.
// Tauri auto-serializes KodiqError into a string for the frontend via Display.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum KodiqError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Lock poisoned")]
    LockPoisoned,

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Watcher error: {0}")]
    Watcher(#[from] notify::Error),

    #[error("{0}")]
    Other(String),
}

// Tauri requires IntoResponse — Serialize impl for the error
impl serde::Serialize for KodiqError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Helper: convert a PoisonError into KodiqError::LockPoisoned
impl<T> From<std::sync::PoisonError<T>> for KodiqError {
    fn from(_: std::sync::PoisonError<T>) -> Self {
        KodiqError::LockPoisoned
    }
}
