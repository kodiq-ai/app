pub mod client;
pub mod connection;
pub mod db;
pub mod filesystem;
pub mod git;
pub mod port_forward;
pub mod terminal;

use russh::client::Handle;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshConnectionConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub private_key_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AuthMethod {
    Key,
    Password,
    Agent,
}

impl std::fmt::Display for AuthMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuthMethod::Key => write!(f, "key"),
            AuthMethod::Password => write!(f, "password"),
            AuthMethod::Agent => write!(f, "agent"),
        }
    }
}

impl std::str::FromStr for AuthMethod {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "key" => Ok(AuthMethod::Key),
            "password" => Ok(AuthMethod::Password),
            "agent" => Ok(AuthMethod::Agent),
            _ => Err(format!("Unknown auth method: {}", s)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionStatus {
    Connected,
    Connecting,
    Disconnected,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshActiveConnection {
    pub id: String,
    pub config: SshConnectionConfig,
    pub status: ConnectionStatus,
    pub remote_home: Option<String>,
    pub connected_at: Option<i64>,
}

/// Live SSH connection with russh handle
pub struct SshConnection {
    pub config: SshConnectionConfig,
    pub handle: Handle<client::KodiqSshHandler>,
    pub status: ConnectionStatus,
    pub remote_home: Option<String>,
    pub connected_at: Option<i64>,
}

impl SshConnection {
    pub fn to_active(&self) -> SshActiveConnection {
        SshActiveConnection {
            id: self.config.id.clone(),
            config: self.config.clone(),
            status: self.status.clone(),
            remote_home: self.remote_home.clone(),
            connected_at: self.connected_at,
        }
    }
}

// ── SSH Manager ──────────────────────────────────────────────────────────────

pub struct SshManager {
    pub connections: HashMap<String, SshConnection>,
}

impl SshManager {
    pub fn new() -> Self {
        Self { connections: HashMap::new() }
    }

    pub fn get(&self, id: &str) -> Option<&SshConnection> {
        self.connections.get(id)
    }

    pub fn get_mut(&mut self, id: &str) -> Option<&mut SshConnection> {
        self.connections.get_mut(id)
    }

    pub fn insert(&mut self, conn: SshConnection) {
        self.connections.insert(conn.config.id.clone(), conn);
    }

    pub fn remove(&mut self, id: &str) -> Option<SshConnection> {
        self.connections.remove(id)
    }

    pub fn list_active(&self) -> Vec<SshActiveConnection> {
        self.connections.values().map(|c| c.to_active()).collect()
    }
}

pub type SshState = Arc<Mutex<SshManager>>;

pub fn new_ssh_state() -> SshState {
    Arc::new(Mutex::new(SshManager::new()))
}
