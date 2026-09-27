# Manim Studio

Desktop editor and renderer for [Manim Community](https://www.manim.community/) scenes.
Tauri 2 + React 19 + Vite + TypeScript, with the UI built from
[Watermelon UI](https://ui.watermelon.sh/) components and switchable light/dark themes.

## Requirements

- Node 22+ and pnpm
- Rust toolchain
- [`manim`](https://www.manim.community/) and `ffmpeg` on `PATH` for rendering
- LaTeX, only if you want `Tex` / `MathTex` scenes (not required for the starter templates)

## Development

```bash
pnpm tauri dev   # desktop app (filesystem + rendering)
pnpm dev         # frontend only, in a browser: layout and theming, no file actions
pnpm build       # tsc && vite build
cd src-tauri && cargo test --lib
```

Port 1420 must be free for `pnpm tauri dev`.

## What it does

- **New project** — pick a parent folder; creates `project.json`, `assets/`, and a starter scene
  (`Mathematics`, `Physics`, `CodeAnimation`, or a blank canvas).
- **Scene explorer** — switch, add, and delete scenes; a scene is one Python file named after its class.
- **Editor** — Ace with the project's font and theme, `Ctrl/Cmd+S` saves the active scene.
- **Render** — `manim render` runs inside the project at low/medium/high/production quality, output
  lands in `media/videos/`, the video is previewed in the app and can be revealed in the file manager.
- **Recent projects** — remembered locally and reopened with one click.

## Project layout on disk

```
my-project/
├── project.json
├── assets/
├── scenes/
│   └── Mathematics.py   # class Mathematics(Scene)
└── media/videos/…       # render output
```
