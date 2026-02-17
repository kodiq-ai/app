mod cli;
mod db;
mod filesystem;
mod git;
mod state;
mod terminal;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_state = db::init().expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(state::new_app_state())
        .manage(db_state)
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            app.handle().plugin(tauri_plugin_process::init())?;

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build(),
                )?;
            }
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
            // Git
            git::info::get_git_info,
            git::info::get_project_stats,
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
