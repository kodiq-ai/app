mod cli;
mod db;
pub mod error;
mod filesystem;
mod git;
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
