mod chat;
mod cli;
mod db;
pub mod error;
mod filesystem;
mod git;
mod preview;
mod ssh;
mod state;
mod terminal;

use tracing_subscriber::prelude::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Sentry — init BEFORE anything else (catches panics during setup)
    let _guard = sentry::init(sentry::ClientOptions {
        dsn: option_env!("SENTRY_DSN").and_then(|s| s.parse().ok()),
        release: sentry::release_name!(),
        environment: if cfg!(debug_assertions) {
            Some("development".into())
        } else {
            Some("production".into())
        },
        traces_sample_rate: if cfg!(debug_assertions) { 1.0 } else { 0.2 },
        ..Default::default()
    });

    // Tracing — structured logging + Sentry integration
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            if cfg!(debug_assertions) {
                "debug".into()
            } else {
                "info".into()
            }
        }))
        .with(sentry::integrations::tracing::layer())
        .init();

    tracing::info!("Kodiq starting v{}", env!("CARGO_PKG_VERSION"));

    let db_state = db::init().expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(state::new_app_state())
        .manage(db_state)
        .manage(filesystem::watcher::WatcherState::new())
        .manage(preview::manager::new_preview_state())
        .manage(preview::server::new_server_state())
        .manage(ssh::new_ssh_state())
        .manage(ssh::terminal::new_ssh_terminal_state())
        .manage(ssh::port_forward::new_port_forward_state())
        .manage(chat::new_chat_state())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            app.handle().plugin(tauri_plugin_process::init())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Terminal
            terminal::manager::spawn_terminal,
            terminal::manager::write_to_pty,
            terminal::manager::resize_pty,
            terminal::manager::close_terminal,
            // Filesystem
            filesystem::read::read_dir,
            filesystem::read::read_file,
            filesystem::write::write_file,
            filesystem::watcher::start_watching,
            filesystem::watcher::stop_watching,
            // Git
            git::info::get_git_info,
            git::info::get_project_stats,
            git::info::git_stage,
            git::info::git_unstage,
            git::info::git_stage_all,
            git::info::git_unstage_all,
            git::info::git_commit,
            git::info::git_diff,
            // CLI
            cli::detect::detect_cli_tools,
            cli::detect::detect_default_shell,
            // Database — Projects
            db::projects::db_list_projects,
            db::projects::db_create_project,
            db::projects::db_touch_project,
            db::projects::db_update_project,
            db::projects::db_get_or_create_project,
            // Database — Settings
            db::settings::db_get_setting,
            db::settings::db_set_setting,
            db::settings::db_get_all_settings,
            // Database — Sessions
            db::sessions::db_list_sessions,
            db::sessions::db_save_session,
            db::sessions::db_close_session,
            db::sessions::db_close_all_sessions,
            // Database — History
            db::history::db_search_history,
            db::history::db_recent_history,
            db::history::db_add_history,
            // Database — Snippets
            db::snippets::db_list_snippets,
            db::snippets::db_create_snippet,
            db::snippets::db_use_snippet,
            // Database — Launch Configs
            db::launch_configs::db_list_launch_configs,
            db::launch_configs::db_create_launch_config,
            db::launch_configs::db_update_launch_config,
            db::launch_configs::db_delete_launch_config,
            // Preview — Webview
            preview::manager::preview_navigate,
            preview::manager::preview_resize,
            preview::manager::preview_reload,
            preview::manager::preview_execute_js,
            preview::manager::preview_click,
            preview::manager::preview_fill,
            preview::manager::preview_hover,
            preview::manager::preview_inspect,
            preview::manager::preview_snapshot,
            preview::manager::preview_destroy,
            preview::manager::preview_set_color_scheme,
            preview::manager::preview_screenshot,
            // Preview — Server
            preview::server::preview_start_server,
            preview::server::preview_stop_server,
            preview::server::preview_list_servers,
            preview::server::preview_server_logs,
            // SSH — Connection
            ssh::connection::ssh_connect,
            ssh::connection::ssh_disconnect,
            ssh::connection::ssh_list_connections,
            ssh::connection::ssh_test_connection,
            ssh::connection::ssh_connection_status,
            // SSH — Terminal
            ssh::terminal::ssh_spawn_terminal,
            ssh::terminal::ssh_write,
            ssh::terminal::ssh_resize,
            ssh::terminal::ssh_close_terminal,
            // SSH — Port Forward
            ssh::port_forward::ssh_start_forward,
            ssh::port_forward::ssh_stop_forward,
            ssh::port_forward::ssh_list_forwards,
            // SSH — Database
            ssh::db::ssh_save_connection,
            ssh::db::ssh_delete_connection,
            ssh::db::ssh_list_saved_connections,
            ssh::db::ssh_save_port_forward,
            ssh::db::ssh_delete_port_forward,
            ssh::db::ssh_list_port_forwards,
            // Chat
            chat::chat_send,
            chat::chat_stop,
            // Database — Chat
            db::chat::db_list_chat_messages,
            db::chat::db_save_chat_message,
            db::chat::db_clear_chat,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
