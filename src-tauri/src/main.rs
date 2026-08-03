// main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;                     // Declare the commands module

use commands::create_project;     // Bring the command function into scope

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![create_project])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
