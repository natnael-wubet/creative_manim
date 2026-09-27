use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Serialize)]
pub struct ProjectInfo {
    pub name: String,
    pub template: String,
    pub created: String,
    pub path: String,
    pub scenes: Vec<String>,
}

#[derive(Serialize)]
pub struct RenderResult {
    pub ok: bool,
    pub output: String,
    pub video: Option<String>,
}

fn sanitize_folder(name: &str) -> String {
    name.replace(|c: char| !c.is_alphanumeric() && c != ' ' && c != '-' && c != '_', "")
        .trim()
        .to_string()
}

fn sanitize_class(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '_' || *c == ' ')
        .collect();
    let mut out = String::new();
    for word in cleaned.split_whitespace() {
        let mut chars = word.chars();
        if let Some(first) = chars.next() {
            out.push(first.to_ascii_uppercase());
            out.push_str(chars.as_str());
        }
    }
    if out.is_empty() {
        out.push_str("Scene");
    }
    if out.chars().next().is_some_and(|c| c.is_ascii_digit()) {
        out.insert(0, 'S');
    }
    out
}

fn template_code(class_name: &str) -> String {
    match class_name {
        "Mathematics" => format!(
            r##"from manim import *

class {name}(Scene):
    def construct(self):
        self.camera.background_color = "#0f1115"
        title = Text("{name}", font_size=64, color=BLUE_B)
        # MathTex/Tex need a local LaTeX install, so this template stays on Text.
        formula = Text("\u222b\u2080\u00b9 x\u00b2 dx = 1/3", font_size=54, color=GREEN_B)
        formula.next_to(title, DOWN, buff=1.0)
        self.play(Write(title))
        self.play(Write(formula))
        self.wait()
"##,
            name = class_name
        ),
        "Physics" => format!(
            r##"from manim import *

class {name}(Scene):
    def construct(self):
        self.camera.background_color = "#0f1115"
        dot = Dot(color=YELLOW)
        self.play(dot.animate.move_to(RIGHT * 3))
        self.wait()
"##,
            name = class_name
        ),
        "CodeAnimation" => format!(
            r##"from manim import *

class {name}(Scene):
    def construct(self):
        self.camera.background_color = "#0f1115"
        code = Code(
            code='self.play(Create(Circle()))',
            language="python",
            font_size=32,
        )
        self.play(Write(code))
        self.wait()
"##,
            name = class_name
        ),
        _ => format!(
            r##"from manim import *

class {name}(Scene):
    def construct(self):
        self.camera.background_color = "#0f1115"
        square = Square(color=BLUE_B, fill_opacity=0.5)
        self.play(Create(square))
        self.play(square.animate.rotate(PI / 2))
        self.wait()
"##,
            name = class_name
        ),
    }
}

fn list_scenes(project_dir: &Path) -> Vec<String> {
    let mut scenes: Vec<String> = fs::read_dir(project_dir.join("scenes"))
        .map(|entries| {
            entries
                .filter_map(|entry| entry.ok())
                .filter_map(|entry| {
                    let path = entry.path();
                    if path.extension().and_then(|e| e.to_str()) == Some("py") {
                        path.file_stem()
                            .and_then(|s| s.to_str())
                            .map(|s| s.to_string())
                    } else {
                        None
                    }
                })
                .collect()
        })
        .unwrap_or_default();
    scenes.sort();
    scenes
}

#[tauri::command]
pub fn create_project(
    project_name: String,
    template: String,
    save_path: String,
) -> Result<ProjectInfo, String> {
    let folder_name = sanitize_folder(&project_name);

    if folder_name.is_empty() {
        return Err("Invalid project name".into());
    }

    let project_dir = Path::new(&save_path).join(&folder_name);
    fs::create_dir_all(project_dir.join("scenes")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_dir.join("assets")).map_err(|e| e.to_string())?;

    let config = serde_json::json!({
        "name": folder_name,
        "template": template,
        "created": chrono::Local::now().to_rfc3339(),
    });
    fs::write(
        project_dir.join("project.json"),
        serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    let class_name = match template.as_str() {
        "math" => "Mathematics",
        "physics" => "Physics",
        "code" => "CodeAnimation",
        _ => "BlankCanvas",
    };
    let main_scene = project_dir.join("scenes").join(format!("{}.py", class_name));
    if !main_scene.exists() {
        fs::write(&main_scene, template_code(class_name)).map_err(|e| e.to_string())?;
    }

    Ok(ProjectInfo {
        name: folder_name,
        template,
        created: config["created"].as_str().unwrap_or_default().to_string(),
        path: project_dir.to_string_lossy().into_owned(),
        scenes: list_scenes(&project_dir),
    })
}

#[tauri::command]
pub fn open_project(save_path: String) -> Result<ProjectInfo, String> {
    let project_dir = PathBuf::from(&save_path);
    let config_path = project_dir.join("project.json");

    if !config_path.exists() {
        return Err(format!("No project.json found in {}", save_path));
    }

    let raw = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let config: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

    Ok(ProjectInfo {
        name: config
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("Untitled")
            .to_string(),
        template: config
            .get("template")
            .and_then(|v| v.as_str())
            .unwrap_or("blank")
            .to_string(),
        created: config
            .get("created")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        path: project_dir.to_string_lossy().into_owned(),
        scenes: list_scenes(&project_dir),
    })
}

#[tauri::command]
pub fn read_scene(project_path: String, scene: String) -> Result<String, String> {
    let class_name = sanitize_class(&scene);
    let file = Path::new(&project_path).join("scenes").join(format!("{}.py", class_name));
    if !file.exists() {
        return Err(format!("Scene file not found: {}", file.display()));
    }
    fs::read_to_string(&file).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_scene(project_path: String, scene: String, code: String) -> Result<String, String> {
    let class_name = sanitize_class(&scene);
    if class_name.is_empty() {
        return Err("Invalid scene name".into());
    }
    let scenes_dir = Path::new(&project_path).join("scenes");
    fs::create_dir_all(&scenes_dir).map_err(|e| e.to_string())?;
    let file = scenes_dir.join(format!("{}.py", class_name));
    fs::write(&file, code).map_err(|e| e.to_string())?;
    Ok(file.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn create_scene(project_path: String, scene: String) -> Result<Vec<String>, String> {
    let class_name = sanitize_class(&scene);
    let scenes_dir = Path::new(&project_path).join("scenes");
    fs::create_dir_all(&scenes_dir).map_err(|e| e.to_string())?;
    let file = scenes_dir.join(format!("{}.py", class_name));
    if file.exists() {
        return Err(format!("Scene already exists: {}", class_name));
    }
    fs::write(&file, template_code(&class_name)).map_err(|e| e.to_string())?;
    Ok(list_scenes(Path::new(&project_path)))
}

#[tauri::command]
pub fn delete_scene(project_path: String, scene: String) -> Result<Vec<String>, String> {
    let class_name = sanitize_class(&scene);
    let file = Path::new(&project_path).join("scenes").join(format!("{}.py", class_name));
    if file.exists() {
        fs::remove_file(&file).map_err(|e| e.to_string())?;
    }
    Ok(list_scenes(Path::new(&project_path)))
}

fn newest_video(media_dir: &Path) -> Option<String> {
    // Manim also writes per-animation fragments into `partial_movie_files`;
    // only the combined movies under `videos/` count as a finished render.
    fn collect(dir: &Path, out: &mut Vec<(std::time::SystemTime, PathBuf)>) {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_dir() {
                    if path.file_name().and_then(|n| n.to_str()) != Some("partial_movie_files") {
                        collect(&path, out);
                    }
                } else if path.extension().and_then(|e| e.to_str()) == Some("mp4") {
                    if let Ok(modified) = entry.metadata().and_then(|m| m.modified()) {
                        out.push((modified, path));
                    }
                }
            }
        }
    }

    let mut found = Vec::new();
    collect(&media_dir.join("videos"), &mut found);
    found
        .into_iter()
        .max_by_key(|(modified, _)| *modified)
        .map(|(_, path)| path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn render_scene(
    project_path: String,
    scene: String,
    quality: String,
) -> Result<RenderResult, String> {
    let class_name = sanitize_class(&scene);
    let flag = match quality.as_str() {
        "medium" => "-qm",
        "high" => "-qh",
        "production" => "-qp",
        _ => "-ql",
    };

    let script = format!("scenes/{}.py", class_name);
    let script_path = Path::new(&project_path).join(&script);
    if !script_path.exists() {
        return Err(format!(
            "Scene {class_name} has no file at {script}. Available: {}",
            list_scenes(Path::new(&project_path)).join(", ")
        ));
    }

    let output = Command::new("manim")
        .arg("render")
        .arg(flag)
        .arg("--media_dir")
        .arg("media")
        .arg("--progress_bar")
        .arg("none")
        .arg(&script)
        .arg(&class_name)
        .current_dir(&project_path)
        .output()
        .map_err(|e| {
            format!(
                "Could not run manim ({e}). Install it with `pip install manim`."
            )
        })?;

    let mut log = String::from_utf8_lossy(&output.stdout).to_string();
    if !output.stderr.is_empty() {
        log.push_str(&String::from_utf8_lossy(&output.stderr));
    }

    let ok = output.status.success();
    let video = if ok {
        newest_video(&Path::new(&project_path).join("media"))
    } else {
        None
    };

    Ok(RenderResult { ok, output: log, video })
}

#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    tauri_plugin_opener::open_path(path, None::<&str>).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("manim-studio-test-{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn sanitizes_names() {
        assert_eq!(sanitize_folder("My Project!"), "My Project");
        assert_eq!(sanitize_class("my scene"), "MyScene");
        assert_eq!(sanitize_class("3d intro"), "S3dIntro");
        assert_eq!(sanitize_class("   "), "Scene");
    }

    #[test]
    fn creates_reads_saves_and_deletes_scenes() {
        let root = temp_dir("crud");
        let info = create_project("Demo".into(), "math".into(), root.to_string_lossy().into_owned()).unwrap();
        assert_eq!(info.name, "Demo");
        assert_eq!(info.scenes, vec!["Mathematics".to_string()]);

        let code = read_scene(info.path.clone(), "Mathematics".into()).unwrap();
        assert!(code.contains("class Mathematics(Scene):"));

        save_scene(info.path.clone(), "Mathematics".into(), "# edited\n".into()).unwrap();
        assert_eq!(read_scene(info.path.clone(), "Mathematics".into()).unwrap(), "# edited\n");

        let scenes = create_scene(info.path.clone(), "outro".into()).unwrap();
        assert_eq!(scenes, vec!["Mathematics".to_string(), "Outro".to_string()]);
        assert!(create_scene(info.path.clone(), "outro".into()).is_err());

        assert_eq!(delete_scene(info.path.clone(), "outro".into()).unwrap(), vec!["Mathematics".to_string()]);

        let reopened = open_project(info.path.clone()).unwrap();
        assert_eq!(reopened.name, "Demo");
        assert_eq!(reopened.template, "math");

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn rejects_empty_project_name() {
        let root = temp_dir("invalid");
        assert!(create_project("!!!".into(), "blank".into(), root.to_string_lossy().into_owned()).is_err());
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn missing_project_is_an_error() {
        assert!(open_project("/definitely/not/a/project".into()).is_err());
    }

    #[test]
    fn renders_a_scene_with_manim() {
        let root = temp_dir("render");
        let info = create_project("Render".into(), "blank".into(), root.to_string_lossy().into_owned()).unwrap();
        let result = render_scene(info.path.clone(), "BlankCanvas".into(), "low".into()).unwrap();

        assert!(result.ok, "manim failed:\n{}", result.output);
        let video = result.video.expect("render produced no video");
        assert!(video.ends_with("BlankCanvas.mp4"), "unexpected video path: {video}");
        assert!(!video.contains("partial_movie_files"));

        fs::remove_dir_all(&root).unwrap();
    }
}
