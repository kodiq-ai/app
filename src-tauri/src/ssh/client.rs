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
    /// WARNING: Currently accepts all host keys. This is a known security limitation.
    /// A production deployment MUST implement known_hosts verification to prevent MITM attacks.
    /// Planned for Phase 6: check against ~/.ssh/known_hosts, prompt user for unknown keys.
    async fn check_server_key(&mut self, key: &PublicKey) -> Result<bool, Self::Error> {
        tracing::warn!(
            "Accepting SSH host key without verification (fingerprint: {:?}). \
             Known-hosts check is not yet implemented.",
            key.fingerprint()
        );
        Ok(true)
    }
}
