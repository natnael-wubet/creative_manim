// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod commands;

use commands::{
    create_project, create_scene, delete_scene, open_path, open_project, read_scene, render_scene,
    save_scene,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            create_project,
            open_project,
            read_scene,
            save_scene,
            create_scene,
            delete_scene,
            render_scene,
            open_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
