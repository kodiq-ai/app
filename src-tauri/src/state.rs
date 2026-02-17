use portable_pty::MasterPty;
use std::collections::HashMap;
use std::io::Write;
use std::sync::Mutex;

// ── Terminal State ────────────────────────────────────────────────────

pub struct PtyInstance {
    pub writer: Box<dyn Write + Send>,
    pub master: Box<dyn MasterPty + Send>,
    #[allow(dead_code)]
    pub label: String,
}

pub struct TerminalState {
    pub terminals: HashMap<String, PtyInstance>,
    pub next_id: u32,
}

// ── Database State ───────────────────────────────────────────────────

pub struct DbState {
    pub connection: Mutex<rusqlite::Connection>,
}

impl DbState {
    pub fn new(conn: rusqlite::Connection) -> Self {
        Self { connection: Mutex::new(conn) }
    }
}

// ── App-wide State ───────────────────────────────────────────────────

pub type AppState = Mutex<TerminalState>;

pub fn new_app_state() -> AppState {
    Mutex::new(TerminalState { terminals: HashMap::new(), next_id: 0 })
}
