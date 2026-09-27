# AGENTS.md

Manim Studio: Tauri 2 desktop app (React 19 + Vite 7 + TypeScript) that edits and renders
[Manim Community](https://www.manim.community/) scenes. Projects are plain folders on disk.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm tauri dev` | **Use this.** Vite (port 1420, `strictPort`) plus the desktop app. Every filesystem and render action needs the Tauri webview. |
| `pnpm dev` | Frontend only, in a normal browser. Good for layout/theme work; file and render actions are disabled and the UI says why. |
| `pnpm build` | `tsc && vite build`. There is no separate typecheck script, and no lint or test script. |
| `cd src-tauri && cargo test --lib` | Backend tests. One runs a real `manim` render (~2s). |
| `cd src-tauri && cargo build` | Backend build. |
| `pnpm tauri build` | Bundle. |

`pnpm tauri dev` fails hard if port 1420 is busy (`strictPort`) — kill stray `vite` processes first.

Local toolchain: pnpm 11.24.0, Node 26, `manim` 0.20.1 on `PATH`
(`/home/naty/miniconda3/bin/manim`), `ffmpeg` present. **No LaTeX is installed**, so `Tex`/`MathTex`
scenes fail; the starter templates use `Text`. Install LaTeX before promising math rendering.

## Frontend layout

- `src/App.tsx` — route `/` renders `Home` or `Editor` based on `isEditingAtom`; also mounts `NewProjectModal` and the sonner `Toaster`, and imports `src/index.css`. Keep the CSS import.
- `src/main.tsx` — `BrowserRouter` + `StrictMode` only.
- `src/components/OuterShell/` — `TopBar` (brand, project, save, render, theme switch), `AppSidebar` (Watermelon `MacOSSidebar` + scene explorer), `OuterShell` (header/sidebar grid with `<Outlet>`).
- `src/components/Editor/` — Ace pane, resizable preview/console, render quality + output path, and `VideoPlayer` (the preview transport).
- `src/components/CodeEditor/` — Ace wrapper.
- `src/components/Home/` — hero, feature cards, recent projects.
- `src/components/NewProjectModal/` — base-ui dialog: name + template, then a folder picker, then `create_project`.
- Each component directory re-exports through `index.ts`; import as `@/components/Editor`.
- `*.module.css` is gone. Styling is Tailwind v4 utilities plus oklch tokens in `src/index.css`. There is no `postcss.config.cjs` — Tailwind runs through the `@tailwindcss/vite` plugin.
- Mantine, `framer-motion`, and the Mantine PostCSS presets were removed. Do not reintroduce them.

## Watermelon UI

Watermelon is a copy/paste shadcn registry, **not** an npm package:

```bash
npx shadcn@latest add https://registry.watermelon.sh/r/<slug>.json -y -o -p src/components/watermelon
```

- `components.json` sets `aliases.ui` to `@/components/base-ui` and registers
  `"@watermelon": "https://registry.watermelon.sh/r/{name}.json"`. Watermelon source imports
  `@/components/base-ui/*`; breaking that alias breaks the tree.
- Registry gotchas hit in this repo: the `utils` item resolved to the wrong npm `cn` package (base
  primitives import `cn` from `@/components/base-ui/utils`, which re-exports `@/lib/utils`); bare
  dependencies land in the same folder as the main item, so primitives must be moved into
  `src/components/base-ui/`; `next-themes` does not work here (use `@/hooks/useTheme`); direct HTTP
  fetches need `Accept: application/json` or the site returns HTML.
- Current state: `src/components/watermelon/` holds only the three components the app uses
  (`macos-sidebar`, `switch-mode`, `shimmer-button`); primitives live in `src/components/base-ui/`.
  Registry demos the app does not use are deleted, not kept.
- Vendored files keep their original code; edits stay local and minimal. `macos-sidebar.tsx` swaps the
  neutral palette for sidebar theme tokens and adds controlled selection (`selectedIndex`/`onSelect`).
- The rail is a fixed 240px open and 65px folded, inside `p-2` (16px) + `p-3` (24px) with a
  `pl-4 lg:pl-8` / `pr-2` gutter on the content pane. `OuterShell` sizes the `<aside>` from those
  numbers (520/360 wide, 500/330 narrow) so scene names stay readable down to the 960px window
  minimum. Do not shrink those widths "to save space" — it silently starves the explorer.
- `sidebarRailOpenAtom` drives the rail, and `OuterShell` folds it below 1280px on breakpoint
  crossings only, so a manual toggle is not fought by an effect.

## Theming

- `src/atoms/theme.ts` — `themePreferenceAtom` (`light | dark | system`, `atomWithStorage`), `systemThemeAtom`, `resolvedThemeAtom`, `applyThemeToDocument()`.
- Storage key is `manimTheme` and holds a **JSON-encoded** string. `index.html` parses it before first paint so the window never flashes the wrong theme; change the key in both places.
- `ThemeSync` toggles `.dark` on `<html>`, sets `colorScheme`, and feeds OS changes into `systemThemeAtom`.
- Components read theme with `useTheme()`; the Watermelon `SwitchMode` toggle in the top bar is the only control.
- Ace follows the same theme (`github` / `one_dark`).

## Project state and Tauri calls

- `src/atoms/projects.ts` — persisted `currentProjectAtom`, `isEditingAtom`, `activeSceneAtom`, `recentProjectsAtom`, `renderQualityAtom`, `sidebarRailOpenAtom`; in-memory `sceneCodeAtom`, `dirtyScenesAtom`, `renderStateAtom`, modal atoms.
- `src/lib/project.ts` — typed `projectApi` wrappers over `invoke` plus the `isTauri()` guard. Go through it; never call `invoke` from a component.
- `src/hooks/useProjectActions.ts` — every flow (pick/create/open project, select scene, edit, save, add/delete scene, render, reveal) with sonner toasts. Components consume this hook instead of duplicating logic.
- Editor shortcut: `Ctrl/Cmd+S` saves the active scene.
- Scene list = file stems of `scenes/*.py`; the stem is also the Python class name.

## Backend

- `src-tauri/src/commands.rs` — `create_project`, `open_project`, `read_scene`, `save_scene`, `create_scene`, `delete_scene`, `render_scene`, `open_path`, plus `#[cfg(test)]` tests that call them directly. They are plain functions, no `State` or `AppHandle`.
- `src-tauri/src/lib.rs` owns `run()` and the `generate_handler!` list; `main.rs` only calls `creative_manim_lib::run()`. **Register new commands in `lib.rs`.**
- Scene identity: `sanitize_class` PascalCases input, so `third scene` becomes `Third` and lives at `scenes/Third.py` with `class Third(Scene)`.
- `create_project` writes `project.json`, `assets/`, and one starter scene (`Mathematics`, `Physics`, `CodeAnimation`, or `BlankCanvas`); the parent folder is picked by the frontend with `@tauri-apps/plugin-dialog`.
- `render_scene` maps quality to `-ql | -qm | -qh | -qp`, runs `manim render --media_dir media --progress_bar none` inside the project, and returns the newest **combined** mp4 — `partial_movie_files` is skipped deliberately, otherwise a partial fragment wins.
- `open_path` (reveal in the file manager) needs `opener:allow-open-path` in `src-tauri/capabilities/default.json`.
- `src-tauri/tauri.conf.json` also owns the window geometry (1440x900, min 960x600) and the `Manim Studio` product name.

## Video preview (do not "simplify" this back)

The preview `<video>` is **not** fed by `convertFileSrc`. It is served by a loopback HTTP server.

- `convertFileSrc` yields `asset://localhost/...`, and WebKitGTK hands that URI to GStreamer, which
  will not decode it. The video silently never plays. This is upstream, not a config mistake:
  tauri#3725, WebKit bug 146351. Tauri's asset protocol is fine (correct `video/mp4`, real Range
  support, `["**"]` scope matches the absolute path) — the GStreamer/URI-scheme handoff is what
  breaks. `assetProtocol` and the `protocol-asset` feature stay configured, so do not chase them.
- `src-tauri/src/media.rs` is a hand-rolled `std::net` server on `127.0.0.1:0`, started lazily on
  the first `media_url` call. It serves only paths that were explicitly registered (opaque token
  per file, allowlist capped at 32), so it is not a general file server. It answers `GET`/`HEAD`
  with `200`/`206`/`404`/`416`, and closes the connection per request (`Connection: close`) rather
  than implementing keep-alive.
- `media_url` in `src-tauri/src/media.rs` is the one command that takes `State<'_, Arc<MediaServer>>`;
  the `commands.rs` functions stay plain. `lib.rs` holds the `Arc<MediaServer>` in the Tauri state.
- `render_scene` remuxes with `ffmpeg -c copy -movflags +faststart` to a staged `*.mp4.faststart`
  file (needs `-f mp4`, since the staged extension confuses ffmpeg's muxer choice) and renames it
  only on success. Remux failure is non-fatal; the un-remuxed file still plays.
- Frontend: `src/components/Editor/VideoPlayer.tsx`, reached through `projectApi.media()`. Playback
  state (volume, muted, rate, loop) persists under `manimPlayer`.
- `csp` is `null` in `tauri.conf.json`, which is what lets the webview load `http://127.0.0.1`.

## Editor notes

- `react-resizable-panels` is v4: `Group` + `Panel` + `Separator` with `orientation`, not `PanelGroup`/`PanelResizeHandle`/`direction`. Panels are found in tests via `[data-panel]`, the drag handle via `[data-separator]`.
- Ace (`react-ace`) needs its mode, themes, and `ext-language_tools` imported statically from `ace-builds/src-noconflict/*`. Snippets are off on purpose: they are fetched at runtime and 404 under Vite. `fontFamily` only exists in `setOptions`, not as a prop.
- The code editor is controlled: `value` comes from `sceneCodeAtom` and every keystroke marks the scene dirty.

## Conventions

- Jotai atoms are named `<name>Atom` with lowercase storage keys (`isEditingState` is the only legacy `State` suffix). `newAtom.py`/`createAtom.py` scaffold atom files, but `createComponent.py` still emits a `*.module.css` import that no longer exists — write components directly.
- Path alias is `@/` → `src/`.
- Icons are `@hugeicons/core-free-icons` + `<HugeiconsIcon icon={X} className="size-4" />`. Verify names against the package; intuitive guesses such as `Save01Icon` do not exist.
- Keep commits incremental and only stage what you changed.
- Before finishing: `pnpm build` and `cd src-tauri && cargo test --lib` must pass, and the app must be opened with `pnpm tauri dev` (a browser alone cannot exercise the filesystem or the renderer).
