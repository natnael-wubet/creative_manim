use std::fs;
use std::path::Path;

#[tauri::command]
pub fn create_project(project_name: String, template: String, save_path: String) -> Result<String, String> {
    let folder_name = project_name
        .replace(|c: char| !c.is_alphanumeric() && c != ' ' && c != '-' && c != '_', "")
        .trim()
        .to_string();

    if folder_name.is_empty() {
        return Err("Invalid project name".into());
    }

    let project_dir = Path::new(&save_path).join(&folder_name);
    fs::create_dir_all(&project_dir).map_err(|e| e.to_string())?;

    // Create project config file
    let config = format!(
        r#"{{ "name": "{}", "template": "{}", "created": "{}" }}"#,
        folder_name,
        template,
        chrono::Local::now().to_rfc3339()
    );
    fs::write(project_dir.join("project.json"), config).map_err(|e| e.to_string())?;

    // Basic sub‑folders
    fs::create_dir_all(project_dir.join("scenes")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("assets")).map_err(|e| e.to_string())?;

    Ok(project_dir.to_string_lossy().into_owned())
}
