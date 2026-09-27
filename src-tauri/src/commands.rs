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

#[derive(Serialize, Debug)]
pub struct SplitResult {
    pub created: Vec<String>,
    pub existing: Vec<String>,
    pub scenes: Vec<String>,
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

/// Resolves a scene entry from the scene list to its file.
///
/// `sanitize_class` is only for a name the user is inventing in `create_scene`.
/// The scene list hands back real file stems, and projects that were not made
/// by this app use stems like `s02_ch1`; running those through `sanitize_class`
/// rewrites them to `S02_ch1` and the file is never found. So the stem is used
/// verbatim, and only validated so that nothing can escape `scenes/`.
fn scene_file(project_path: &str, scene: &str) -> Result<PathBuf, String> {
    let stem = scene.trim();
    let valid = !stem.is_empty()
        && !stem.starts_with('.')
        && !stem.contains("..")
        && stem
            .chars()
            .all(|c| c.is_alphanumeric() || c == '_' || c == '-');
    if !valid {
        return Err(format!("Invalid scene name: {scene}"));
    }
    Ok(Path::new(project_path)
        .join("scenes")
        .join(format!("{stem}.py")))
}

/// The class to hand `manim render` for a scene file.
///
/// Scenes this app creates name the class after the file, but a project from
/// elsewhere can disagree: `scenes/s02_ch1.py` may well declare
/// `class Scene02Ch1`. Passing the stem to manim then fails to find a scene, so
/// fall back to whatever the file actually declares.
fn scene_class_name(file: &Path, stem: &str) -> String {
    let Ok(source) = fs::read_to_string(file) else {
        return stem.to_string();
    };
    let declared: Vec<&str> = source
        .lines()
        .filter_map(|line| {
            let rest = line.strip_prefix("class ")?;
            let name = rest.split(['(', ':', ' ']).next()?;
            if name.is_empty() || !name.starts_with(|c: char| c.is_alphabetic() || c == '_') {
                return None;
            }
            Some(name)
        })
        .collect();
    if declared.iter().any(|name| *name == stem) {
        return stem.to_string();
    }
    declared
        .iter()
        .find(|name| name.contains("Scene"))
        .or_else(|| declared.first())
        .map(|name| name.to_string())
        .unwrap_or_else(|| stem.to_string())
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
    let file = scene_file(&project_path, &scene)?;
    if !file.exists() {
        return Err(format!("Scene file not found: {}", file.display()));
    }
    fs::read_to_string(&file).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_scene(project_path: String, scene: String, code: String) -> Result<String, String> {
    let file = scene_file(&project_path, &scene)?;
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
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
    fs::write(&file, empty_scene_code(&class_name)).map_err(|e| e.to_string())?;
    Ok(list_scenes(Path::new(&project_path)))
}

/// The body a newly added scene starts with.
///
/// A project template is a worked example worth reading, but a scene added
/// mid session is not: seeding it with the same demo animation made every new
/// file look like it already held somebody's scene, which is exactly what the
/// author is about to replace. Start empty instead.
fn empty_scene_code(class_name: &str) -> String {
    format!(
        r#"from manim import *


class {class_name}(Scene):
    def construct(self):
        self.wait()
"#
    )
}

#[tauri::command]
pub fn delete_scene(project_path: String, scene: String) -> Result<Vec<String>, String> {
    let file = scene_file(&project_path, &scene)?;
    if file.exists() {
        fs::remove_file(&file).map_err(|e| e.to_string())?;
    }
    Ok(list_scenes(Path::new(&project_path)))
}

/// A top-level class in a scene file, with the line range it occupies.
struct ClassBlock {
    name: String,
    bases: Vec<String>,
    start: usize,
    end: usize,
}

/// Whether a line begins a new top-level construct, ending a class body.
fn starts_top_level(line: &str) -> bool {
    let trimmed = line.trim();
    // Blank lines and comments never end a class body: a comment run belongs to
    // whatever follows it, and is picked up by the next block's start.
    if trimmed.is_empty() || trimmed.starts_with('#') {
        return false;
    }
    !line.starts_with([' ', '\t'])
}

/// Every top-level class in a scene file, in source order.
///
/// This is a line scan, not a parse. It only has to be good enough to cut a file
/// into pieces that each still run under manim, so a top-level `class` line ends
/// at the next top-level statement and the comment lines directly above a class
/// travel with it.
fn top_level_classes(source: &str) -> Vec<ClassBlock> {
    let lines: Vec<&str> = source.lines().collect();
    let mut blocks: Vec<ClassBlock> = Vec::new();
    let mut index = 0;

    while index < lines.len() {
        let Some(header) = lines[index].strip_prefix("class ") else {
            index += 1;
            continue;
        };
        let header = header.trim_end();
        let name = header
            .split(['(', ':', ' '])
            .next()
            .unwrap_or_default()
            .to_string();
        let bases = match header.split_once('(') {
            Some((_, tail)) => tail
                .split_once(')')
                .map(|(inner, _)| {
                    inner
                        .split(',')
                        .filter_map(|base| {
                            // `class Foo(Scene, camera_config=...)`
                            let base = base.split('=').next().unwrap_or("").trim();
                            (!base.is_empty()).then(|| base.to_string())
                        })
                        .collect()
                })
                .unwrap_or_default(),
            None => Vec::new(),
        };

        let mut end = index + 1;
        while end < lines.len() && !starts_top_level(lines[end]) {
            end += 1;
        }

        let mut start = index;
        while start > 0 && lines[start - 1].trim_start().starts_with('#') {
            start -= 1;
        }
        // The scan above stops at this class, so the previous block already
        // swallowed the comment lines that belong to this one. Hand them over,
        // otherwise the same comment ends up in two generated files.
        if let Some(previous) = blocks.last_mut() {
            previous.end = previous.end.min(start);
        }

        blocks.push(ClassBlock {
            name,
            bases,
            start,
            end,
        });
        index = end.max(index + 1);
    }

    blocks
}

/// The names of the classes in a file that are manim scenes.
///
/// A class counts when it derives from something that looks like a scene, which
/// covers `Scene`, a project's own `ChapterScene`, and a chain of local bases
/// ending at one. Everything else is a helper and stays where it is.
fn scene_class_names(blocks: &[ClassBlock]) -> Vec<String> {
    let mut scenes: Vec<String> = Vec::new();
    loop {
        let mut found = false;
        for block in blocks {
            if scenes.contains(&block.name) {
                continue;
            }
            let is_scene = block.bases.iter().any(|base| {
                base.to_ascii_lowercase().contains("scene")
                    || scenes.iter().any(|scene| scene == base)
            });
            if is_scene {
                scenes.push(block.name.clone());
                found = true;
            }
        }
        if !found {
            return scenes;
        }
    }
}

/// The scene classes a scene file declares, so the UI can offer to split it.
#[tauri::command]
pub fn scene_classes(project_path: String, scene: String) -> Result<Vec<String>, String> {
    let file = scene_file(&project_path, &scene)?;
    if !file.exists() {
        return Ok(Vec::new());
    }
    let source = fs::read_to_string(&file).map_err(|e| e.to_string())?;
    Ok(scene_class_names(&top_level_classes(&source)))
}

/// Writes one scene class per file, for a file that declares several.
///
/// A scene is a single class as far as this app is concerned, so a file holding
/// `class Intro`, `class Body` and `class Outro` can only ever render one of
/// them. Each output keeps the module preamble (imports, constants) and any
/// helper class, because a scene that needs them has to still run on its own.
/// The original file is left alone; deleting it is the user's call.
#[tauri::command]
pub fn split_scene(project_path: String, scene: String) -> Result<SplitResult, String> {
    let stem = scene.trim().to_string();
    let file = scene_file(&project_path, &stem)?;
    let source = fs::read_to_string(&file)
        .map_err(|_| format!("Scene file not found: {}", file.display()))?;
    let lines: Vec<&str> = source.lines().collect();
    let blocks = top_level_classes(&source);
    let scenes = scene_class_names(&blocks);

    if scenes.len() < 2 {
        return Err(if scenes.is_empty() {
            format!("{stem}.py declares no scene class.")
        } else {
            format!("{stem}.py only declares {}, so there is nothing to split.", scenes[0])
        });
    }

    let scenes_dir = Path::new(&project_path).join("scenes");
    let mut created = Vec::new();
    let mut existing = Vec::new();

    for target in &scenes {
        let dest = scenes_dir.join(format!("{target}.py"));
        if dest.exists() {
            existing.push(target.clone());
            continue;
        }

        // Walk the file in source order, keeping everything except the other
        // scene classes, so the piece reads like the original.
        let mut kept: Vec<&str> = Vec::new();
        let mut cursor = 0;
        for block in &blocks {
            if block.start > cursor {
                kept.extend_from_slice(&lines[cursor..block.start]);
            }
            cursor = block.end;
            if !scenes.contains(&block.name) || block.name == *target {
                kept.extend_from_slice(&lines[block.start..block.end]);
            }
        }
        if cursor < lines.len() {
            kept.extend_from_slice(&lines[cursor..]);
        }

        // Removing a class can leave a gap where its two blank lines were.
        let mut body: Vec<&str> = Vec::with_capacity(kept.len());
        let mut blanks = 0;
        for line in kept {
            if line.trim().is_empty() {
                blanks += 1;
                if blanks > 2 {
                    continue;
                }
            } else {
                blanks = 0;
            }
            body.push(line);
        }
        while body.last().is_some_and(|line| line.trim().is_empty()) {
            body.pop();
        }

        fs::write(&dest, format!("{}\n", body.join("\n"))).map_err(|e| e.to_string())?;
        created.push(target.clone());
    }

    // The original becomes a combiner: one scene that runs the split pieces in
    // the order they were declared, so the stem still renders and still imports
    // the classes it used to hold. The text it replaces is kept next to it,
    // because a split can leave a class behind in a file that already existed
    // and the original is the only copy of that version.
    let backup = file.with_extension("py.orig");
    fs::write(&backup, &source).map_err(|e| e.to_string())?;
    fs::write(&file, combiner_source(&scenes)).map_err(|e| e.to_string())?;

    Ok(SplitResult {
        created,
        existing,
        scenes: list_scenes(Path::new(&project_path)),
    })
}

/// A single scene that runs each split piece in turn.
///
/// A class called `Scene` or `Combined` would shadow the names this needs, so
/// those two arrive under an alias instead.
fn combiner_source(scenes: &[String]) -> String {
    let mut imports = Vec::new();
    let mut names = Vec::new();
    for (index, name) in scenes.iter().enumerate() {
        if name == "Scene" || name == "Combined" {
            let alias = format!("{name}Part{index}");
            imports.push(format!("from {name} import {name} as {alias}"));
            names.push(alias);
        } else {
            imports.push(format!("from {name} import {name}"));
            names.push(name.clone());
        }
    }

    let mut out = String::from(
        "\"\"\"The scenes that used to be in this file, run one after another.\n\n\
         They were split out into the files imported below, each with the module\n\
         level code it needs. Delete this file if you do not need the combined\n\
         view; the original text is in the .py.orig next to it.\n\
         \"\"\"\n\n\
         from manim import Scene\n\n",
    );
    out.push_str(&imports.join("\n"));
    out.push_str("\n\n\nclass Combined(Scene):\n    def construct(self):\n        for scene_cls in (\n");
    for name in &names {
        out.push_str(&format!("            {name},\n"));
    }
    // The unbound function, handed this scene as `self`. Instantiating the
    // class instead would either pass a second argument to a bound method or
    // render into a throwaway scene that never reaches this file.
    out.push_str("        ):\n            scene_cls.construct(self)\n");
    out
}

/// True unless the `moov` atom already sits in front of the media data. Only
/// the head of the file is inspected, which is all that decides it.
fn needs_faststart(path: &Path) -> bool {
    fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
        haystack
            .windows(needle.len())
            .position(|window| window == needle)
    }
    let Ok(bytes) = fs::read(path) else {
        return false;
    };
    let head = &bytes[..bytes.len().min(1 << 20)];
    match (find(head, b"moov"), find(head, b"mdat")) {
        (Some(moov), Some(mdat)) => moov > mdat,
        (Some(_), None) => false,
        _ => true,
    }
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

/// Manim writes the `moov` atom at the end of the file, so the webview has to
/// pull the whole thing before it can play. Remuxing is a stream copy, costs
/// nothing, and leaves the index up front. A missing ffmpeg is not fatal.
fn remux_faststart(video: &str) {
    let path = Path::new(video);
    if !needs_faststart(path) {
        return;
    }
    let staged = path.with_extension("mp4.faststart");

    let result = Command::new("ffmpeg")
        .args(["-y", "-loglevel", "error", "-i"])
        .arg(path)
        .args(["-c", "copy", "-movflags", "+faststart"])
        // The staged name has no mp4 extension, so the format cannot be inferred.
        .args(["-f", "mp4"])
        .arg(&staged)
        .output();

    match result {
        Ok(output) if output.status.success() => {
            if fs::rename(&staged, path).is_ok() {
                return;
            }
        }
        Ok(output) => {
            eprintln!("ffmpeg could not remux: {}", String::from_utf8_lossy(&output.stderr));
        }
        Err(e) => eprintln!("ffmpeg is unavailable, skipping the remux: {e}"),
    }

    let _ = fs::remove_file(&staged);
}

/// Manim reads `media_dir` out of the project's `manim.cfg`, so a project made
/// outside this app may not keep its videos under `media/` at all. Returns the
/// directories that can hold a finished movie.
fn video_roots(project_dir: &Path) -> Vec<PathBuf> {
    let mut roots = vec![project_dir.join("media").join("videos")];
    if let Some(configured) = fs::read_to_string(project_dir.join("manim.cfg"))
        .ok()
        .and_then(|cfg| {
            cfg.lines()
                .filter_map(|line| line.split_once('='))
                .find(|(key, _)| key.trim().eq_ignore_ascii_case("media_dir"))
                .map(|(_, value)| value.trim().to_string())
        })
    {
        let root = project_dir.join(configured).join("videos");
        if !roots.contains(&root) {
            roots.push(root);
        }
    }
    roots
}

/// The newest finished movie for one scene class, skipping the per-animation
/// fragments. Matching on the class name matters: a scene lives at
/// `<media_dir>/videos/<file stem>/<quality>/<class name>.mp4`, so the directory
/// and the file disagree for any project that does not name its classes after
/// their files.
fn latest_scene_video(project_dir: &Path, class_name: &str) -> Option<String> {
    fn collect(dir: &Path, class_name: &str, best: &mut Option<(std::time::SystemTime, PathBuf)>) {
        let Ok(entries) = fs::read_dir(dir) else {
            return;
        };
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_dir() {
                if path.file_name().and_then(|n| n.to_str()) != Some("partial_movie_files") {
                    collect(&path, class_name, best);
                }
            } else if path.extension().and_then(|e| e.to_str()) == Some("mp4")
                && path.file_stem().and_then(|s| s.to_str()) == Some(class_name)
            {
                if let Ok(modified) = entry.metadata().and_then(|m| m.modified()) {
                    if best.as_ref().is_none_or(|(seen, _)| modified > *seen) {
                        *best = Some((modified, path));
                    }
                }
            }
        }
    }

    let mut best = None;
    for root in video_roots(project_dir) {
        collect(&root, class_name, &mut best);
    }
    best.map(|(_, path)| path.to_string_lossy().into_owned())
}

/// The last render of a scene, if the project still has one on disk. Lets the
/// preview show a finished video without paying for another render.
#[tauri::command(async)]
pub fn latest_render(project_path: String, scene: String) -> Result<Option<String>, String> {
    let stem = scene.trim().to_string();
    let file = scene_file(&project_path, &stem)?;
    let project_dir = Path::new(&project_path);
    if !file.exists() {
        return Ok(None);
    }
    let class_name = scene_class_name(&file, &stem);
    Ok(latest_scene_video(project_dir, &class_name))
}

#[tauri::command(async)]
pub fn render_scene(
    project_path: String,
    scene: String,
    quality: String,
) -> Result<RenderResult, String> {
    let flag = match quality.as_str() {
        "medium" => "-qm",
        "high" => "-qh",
        "production" => "-qp",
        _ => "-ql",
    };

    let stem = scene.trim().to_string();
    let script_path = scene_file(&project_path, &stem)?;
    if !script_path.exists() {
        return Err(format!(
            "Scene {stem} has no file at scenes/{stem}.py. Available: {}",
            list_scenes(Path::new(&project_path)).join(", ")
        ));
    }
    let class_name = scene_class_name(&script_path, &stem);
    let script = format!("scenes/{stem}.py");

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
        // Prefer the movie that belongs to the class we just asked manim for;
        // fall back to the newest one in case the class guess was off.
        let found = latest_scene_video(Path::new(&project_path), &class_name)
            .or_else(|| newest_video(&Path::new(&project_path).join("media")));
        if let Some(path) = &found {
            remux_faststart(path);
        }
        found
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

        // Scene commands address a file by the stem the list reports, which is
        // not always the text that was typed.
        assert_eq!(delete_scene(info.path.clone(), scenes[1].clone()).unwrap(), vec!["Mathematics".to_string()]);

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

    /// A project that this app did not create can have scene stems that are not
    /// PascalCase, such as `s02_ch1`. Those have to round-trip untouched.
    #[test]
    fn keeps_lowercase_scene_stems_verbatim() {
        let root = temp_dir("lowercase");
        let info = create_project("Lower".into(), "blank".into(), root.to_string_lossy().into_owned()).unwrap();
        let scenes = Path::new(&info.path).join("scenes");
        fs::write(scenes.join("s02_ch1.py"), "class Scene02Ch1(Scene):\n    pass\n").unwrap();

        let listed = open_project(info.path.clone()).unwrap();
        assert!(listed.scenes.contains(&"s02_ch1".to_string()));
        let code = read_scene(info.path.clone(), "s02_ch1".into()).unwrap();
        assert!(code.contains("class Scene02Ch1"));

        // A save must update that file, not fork a `S02_ch1.py` beside it.
        save_scene(info.path.clone(), "s02_ch1".into(), "# edited\n".into()).unwrap();
        assert_eq!(read_scene(info.path.clone(), "s02_ch1".into()).unwrap(), "# edited\n");
        assert!(!scenes.join("S02_ch1.py").exists(), "save created a case-variant file");
        assert_eq!(fs::read_dir(&scenes).unwrap().count(), 2);

        assert_eq!(delete_scene(info.path.clone(), "s02_ch1".into()).unwrap(), vec!["BlankCanvas".to_string()]);
        assert!(!scenes.join("s02_ch1.py").exists());

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn scene_names_cannot_escape_the_scenes_directory() {
        let root = temp_dir("traversal");
        let info = create_project("Escape".into(), "blank".into(), root.to_string_lossy().into_owned()).unwrap();
        for bad in ["../secrets", "..\\secrets", "/etc/passwd", ".hidden", "..", "sub/dir"] {
            assert!(
                read_scene(info.path.clone(), bad.into()).is_err(),
                "expected {bad} to be rejected"
            );
            assert!(
                scene_file(&info.path, bad).is_err(),
                "expected {bad} to be rejected"
            );
        }
        // A leading `__` is legal, and `__pycache__` never reaches here because
        // list_scenes only reports `.py` files.
        assert!(scene_file(&info.path, "__init__").is_ok());
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn finds_the_scene_class_declared_in_the_file() {
        let root = temp_dir("classname");
        let file = root.join("s02_ch1.py");

        fs::write(&file, "class Helper:\n    pass\n\n\nclass Scene02Ch1(ChapterScene):\n    pass\n").unwrap();
        assert_eq!(scene_class_name(&file, "s02_ch1"), "Scene02Ch1");

        // The app's own convention, stem equals class, must be preserved.
        fs::write(&file, "class Mathematics(Scene):\n    pass\n").unwrap();
        assert_eq!(scene_class_name(&file, "Mathematics"), "Mathematics");

        // No class at all falls back to the stem so manim reports it.
        fs::write(&file, "x = 1\n").unwrap();
        assert_eq!(scene_class_name(&file, "Loop"), "Loop");

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

        // The remux must leave the index in front of the media data, otherwise
        // the webview has to buffer the whole file before the first frame.
        let bytes = fs::read(&video).unwrap();
        let head = &bytes[..bytes.len().min(1 << 20)];
        let mdat = find(head, b"mdat");
        let moov = find(head, b"moov");
        assert!(moov.is_some(), "no moov atom in {video}");
        assert!(
            mdat.is_none() || moov < mdat,
            "expected moov before mdat, got moov at {moov:?} and mdat at {mdat:?}"
        );

        fs::remove_dir_all(&root).unwrap();
    }


    fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
        haystack
            .windows(needle.len())
            .position(|window| window == needle)
    }

    /// `scenes/s02_ch1.py` declaring `class Scene02Ch1` is a normal shape for a
    /// project made outside this app. manim has to be told the declared class,
    /// not the file stem.
    #[test]
    fn renders_a_scene_whose_class_differs_from_its_stem() {
        let root = temp_dir("stemclass");
        let info = create_project("Stem".into(), "blank".into(), root.to_string_lossy().into_owned()).unwrap();
        fs::write(
            Path::new(&info.path).join("scenes").join("s02_ch1.py"),
            "from manim import *\n\n\nclass Scene02Ch1(Scene):\n    def construct(self):\n        self.wait(0.1)\n",
        )
        .unwrap();

        let result = render_scene(info.path.clone(), "s02_ch1".into(), "low".into()).unwrap();
        assert!(result.ok, "manim failed:\n{}", result.output);
        assert!(result.video.expect("no video").ends_with("Scene02Ch1.mp4"));

        fs::remove_dir_all(&root).unwrap();
    }


    #[test]
    fn finds_a_previous_render_without_rendering() {
        let root = temp_dir("latest");
        let info = create_project("Prev".into(), "blank".into(), root.to_string_lossy().into_owned()).unwrap();
        let project = Path::new(&info.path);

        // Nothing rendered yet.
        assert_eq!(latest_render(info.path.clone(), "BlankCanvas".into()).unwrap(), None);

        // Manim puts the movie at <media_dir>/videos/<file stem>/<quality>/<class>.mp4,
        // so the directory and the file name disagree for this project shape.
        let out = project.join("media").join("videos").join("s02_ch1").join("480p15");
        fs::create_dir_all(&out).unwrap();
        fs::write(
            project.join("scenes").join("s02_ch1.py"),
            "class Scene02Ch1(Scene):\n    pass\n",
        )
        .unwrap();
        fs::write(out.join("Scene02Ch1.mp4"), "not really a movie").unwrap();

        let found = latest_render(info.path.clone(), "s02_ch1".into()).unwrap();
        assert_eq!(found.as_deref(), Some(out.join("Scene02Ch1.mp4").to_str().unwrap()));
        // Another scene must not borrow it.
        assert_eq!(latest_render(info.path.clone(), "BlankCanvas".into()).unwrap(), None);

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn finds_renders_written_to_a_configured_media_dir() {
        let root = temp_dir("mediadir");
        let info = create_project("Cfg".into(), "blank".into(), root.to_string_lossy().into_owned()).unwrap();
        let project = Path::new(&info.path);
        fs::write(project.join("manim.cfg"), "[CLI]\nmedia_dir = renders\n").unwrap();

        let out = project.join("renders").join("videos").join("BlankCanvas").join("1080p60");
        fs::create_dir_all(&out).unwrap();
        fs::write(out.join("BlankCanvas.mp4"), "movie").unwrap();
        // A fragment must never win over the combined movie.
        let partial = out.join("partial_movie_files").join("BlankCanvas");
        fs::create_dir_all(&partial).unwrap();
        fs::write(partial.join("BlankCanvas.mp4"), "fragment").unwrap();

        let found = latest_render(info.path.clone(), "BlankCanvas".into()).unwrap().expect("no render found");
        assert!(found.ends_with("videos/BlankCanvas/1080p60/BlankCanvas.mp4"), "got {found}");
        assert!(!found.contains("partial_movie_files"));

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn an_already_seekable_movie_is_left_alone() {
        let root = temp_dir("faststart");
        let path = root.join("clip.mp4");
        // moov ahead of mdat is already seekable, so no remux is needed.
        fs::write(&path, b"\0\0\0\x18ftypmoov......mdat").unwrap();
        assert!(!needs_faststart(&path));
        fs::write(&path, b"\0\0\0\x18ftypmdat......moov").unwrap();
        assert!(needs_faststart(&path));
        assert!(!needs_faststart(&root.join("missing.mp4")));
        fs::remove_dir_all(&root).unwrap();
    }



    #[test]
    fn a_comment_goes_to_the_class_below_it_and_nowhere_else() {
        let root = temp_dir("split-comment");
        let info = create_project("Split".into(), "blank".into(), root.to_string_lossy().into_owned()).unwrap();
        let scenes = Path::new(&info.path).join("scenes");
        fs::write(
            scenes.join("chapter.py"),
            r#"from manim import *


# belongs to Title
class Title(Scene):
    pass


# belongs to Body
class Body(Scene):
    pass
"#,
        )
        .unwrap();

        split_scene(info.path.clone(), "chapter".into()).unwrap();

        let title = fs::read_to_string(scenes.join("Title.py")).unwrap();
        let body = fs::read_to_string(scenes.join("Body.py")).unwrap();
        assert!(title.contains("# belongs to Title"));
        assert!(!title.contains("# belongs to Body"), "leaked into Title: {title}");
        assert!(body.contains("# belongs to Body"));
        assert!(!body.contains("# belongs to Title"), "leaked into Body: {body}");

        // A comment with no class after it stays with the last one.
        assert!(body.contains("pass"), "{body}");

        fs::remove_dir_all(&root).unwrap();
    }



    #[test]
    fn an_added_scene_starts_empty_rather_than_with_the_demo_animation() {
        let root = temp_dir("new-scene");
        let info = create_project("New".into(), "physics".into(), root.to_string_lossy().into_owned()).unwrap();
        // The project template is a worked example and stays as it is.
        let starter = fs::read_to_string(Path::new(&info.path).join("scenes").join("Physics.py")).unwrap();
        assert!(starter.contains("Dot(color=YELLOW)"), "template lost its example");

        create_scene(info.path.clone(), "second".into()).unwrap();
        let added = fs::read_to_string(Path::new(&info.path).join("scenes").join("Second.py")).unwrap();
        assert!(added.contains("class Second(Scene):"), "{added}");
        assert!(!added.contains("0f1115"), "demo animation leaked in: {added}");
        assert!(!added.contains("fill_opacity=0.5"), "demo animation leaked in: {added}");

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn the_combiner_aliases_a_class_that_would_shadow_its_own_names() {
        let combined = combiner_source(&["Scene".into(), "Combined".into(), "Body".into()]);
        assert!(combined.contains("from Scene import Scene as ScenePart0"), "{combined}");
        assert!(combined.contains("from Combined import Combined as CombinedPart1"), "{combined}");
        assert!(combined.contains("from Body import Body"), "{combined}");
        // The sequence uses the aliases, not the shadowing names.
        assert!(combined.contains("            ScenePart0,"), "{combined}");
        assert!(combined.contains("            CombinedPart1,"), "{combined}");
        assert!(combined.contains("            Body,"), "{combined}");
        // A bound method would take a second argument, and a throwaway instance
        // would render to a file nobody is watching.
        assert!(combined.contains("            scene_cls.construct(self)"), "{combined}");
        assert!(!combined.contains("scene_cls().construct"), "{combined}");
    }

    #[test]
    fn splits_a_multi_scene_file_into_one_file_per_class() {
        let root = temp_dir("split");
        let info = create_project("Split".into(), "blank".into(), root.to_string_lossy().into_owned()).unwrap();
        let scenes = Path::new(&info.path).join("scenes");
        fs::write(
            scenes.join("chapter.py"),
            r#"from manim import *

WIDTH = 3


def helper():
    return 1


class Title(Scene):
    def construct(self):
        self.wait()


# a comment that belongs to the next class
class Body(ChapterScene):
    def construct(self):
        self.wait()


class Outro(Scene):
    def construct(self):
        self.wait()
"#,
        )
        .unwrap();

        assert_eq!(scene_classes(info.path.clone(), "chapter".into()).unwrap(), vec!["Title", "Body", "Outro"]);

        let result = split_scene(info.path.clone(), "chapter".into()).unwrap();
        assert_eq!(result.created, vec!["Title", "Body", "Outro"]);
        assert!(result.existing.is_empty());
        // The original keeps working as a combined scene.
        let combined = fs::read_to_string(scenes.join("chapter.py")).unwrap();
        assert!(combined.contains("class Combined(Scene):"), "{combined}");
        assert!(combined.contains("from Title import Title"), "{combined}");
        assert!(combined.contains("from Body import Body"), "{combined}");
        assert!(combined.contains("from Outro import Outro"), "{combined}");
        // Declaration order, so the pieces play in the order they were written.
        let order: Vec<_> = ["Title", "Body", "Outro"]
            .iter()
            .map(|n| combined.find(&format!("{n},")).unwrap())
            .collect();
        assert!(order.windows(2).all(|w| w[0] < w[1]), "wrong order: {combined}");
        // And the text it replaced is still on disk.
        let backup = fs::read_to_string(scenes.join("chapter.py.orig")).unwrap();
        assert!(backup.contains("class Outro(Scene):"));
        assert!(backup.contains("def helper():"));

        let body = fs::read_to_string(scenes.join("Body.py")).unwrap();
        // The preamble and the helper survive, so the piece still runs.
        assert!(body.contains("from manim import *"));
        assert!(body.contains("WIDTH = 3"));
        assert!(body.contains("def helper():"));
        // The comment above the class travelled with it.
        assert!(body.contains("# a comment that belongs to the next class"));
        // And only the one scene class is in there.
        assert!(body.contains("class Body(ChapterScene):"));
        assert!(!body.contains("class Title("));
        assert!(!body.contains("class Outro("));

        let title = fs::read_to_string(scenes.join("Title.py")).unwrap();
        assert!(title.contains("class Title(Scene):"));
        assert!(!title.contains("class Body("));

        // The scene list now offers each one separately.
        let listed = open_project(info.path.clone()).unwrap();
        for name in ["Title", "Body", "Outro"] {
            assert!(listed.scenes.contains(&name.to_string()), "missing {name}");
        }

        // Every piece has to be valid python on its own.
        for name in ["Title", "Body", "Outro", "chapter"] {
            let path = scenes.join(format!("{name}.py"));
            let output = Command::new("python3")
                .args(["-c", "import ast,sys;ast.parse(open(sys.argv[1]).read())"])
                .arg(&path)
                .output()
                .unwrap();
            assert!(output.status.success(), "{name}.py does not parse: {}", String::from_utf8_lossy(&output.stderr));
        }

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn will_not_clobber_a_scene_that_already_exists() {
        let root = temp_dir("split-existing");
        let info = create_project("Split".into(), "blank".into(), root.to_string_lossy().into_owned()).unwrap();
        let scenes = Path::new(&info.path).join("scenes");
        fs::write(
            scenes.join("chapter.py"),
            "from manim import *\n\n\nclass Title(Scene):\n    pass\n\n\nclass Outro(Scene):\n    pass\n",
        )
        .unwrap();
        fs::write(scenes.join("Outro.py"), "# hand written, do not touch\n").unwrap();

        let result = split_scene(info.path.clone(), "chapter".into()).unwrap();
        assert_eq!(result.created, vec!["Title"]);
        assert_eq!(result.existing, vec!["Outro"]);
        assert_eq!(
            fs::read_to_string(scenes.join("Outro.py")).unwrap(),
            "# hand written, do not touch\n"
        );

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn refuses_to_split_a_file_that_is_already_one_scene() {
        let root = temp_dir("split-single");
        let info = create_project("Split".into(), "blank".into(), root.to_string_lossy().into_owned()).unwrap();
        let scenes = Path::new(&info.path).join("scenes");
        fs::write(scenes.join("only.py"), "from manim import *\n\n\nclass Only(Scene):\n    pass\n").unwrap();

        assert_eq!(scene_classes(info.path.clone(), "only".into()).unwrap(), vec!["Only"]);
        let err = split_scene(info.path.clone(), "only".into()).unwrap_err();
        assert!(err.contains("nothing to split"), "unexpected error: {err}");

        // A helper on its own is not a scene file either.
        fs::write(scenes.join("helper.py"), "def go():\n    pass\n").unwrap();
        assert!(scene_classes(info.path.clone(), "helper".into()).unwrap().is_empty());
        assert!(split_scene(info.path.clone(), "helper".into()).is_err());

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn follows_a_chain_of_local_bases_to_find_scenes() {
        // Rooted at a scene, so everything hanging off it is one too.
        let source = r#"class Base(Scene):
    pass


class Middle(Base):
    pass


class Real(Middle):
    pass
"#;
        let blocks = top_level_classes(source);
        assert_eq!(scene_class_names(&blocks), vec!["Base", "Middle", "Real"]);

        // Rooted at something else, nothing in the chain is a scene.
        let unrelated = r#"class Layer:
    pass


class Middle(Layer):
    pass
"#;
        assert!(scene_class_names(&top_level_classes(unrelated)).is_empty());
    }
}
