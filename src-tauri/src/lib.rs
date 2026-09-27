// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod commands;
pub mod media;

use commands::{
    create_project, create_scene, delete_scene, latest_render, open_path, open_project, read_scene,
    render_scene, save_scene, scene_classes, split_scene,
};
use media::MediaServer;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Arc::new(MediaServer::default()))
        .invoke_handler(tauri::generate_handler![
            create_project,
            open_project,
            read_scene,
            save_scene,
            create_scene,
            delete_scene,
            scene_classes,
            split_scene,
            render_scene,
            latest_render,
            open_path,
            media::media_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
