use async_trait::async_trait;
use russh::client;
use russh::keys::key::PublicKey;

/// Kodiq SSH client handler — implements russh::client::Handler.
/// Handles server authentication and channel events.
pub struct KodiqSshHandler;

#[async_trait]
impl client::Handler for KodiqSshHandler {
    type Error = russh::Error;

    /// Called when the server sends its public key.
    /// Accept all host keys (TODO: Phase 6 — known_hosts verification).
    async fn check_server_key(&mut self, _key: &PublicKey) -> Result<bool, Self::Error> {
        Ok(true)
    }
}
