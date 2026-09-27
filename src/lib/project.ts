import { invoke } from "@tauri-apps/api/core";
import type { ProjectInfo, RenderQuality } from "@/atoms/projects";

export interface RenderResult {
  ok: boolean;
  output: string;
  video: string | null;
}

export interface SplitResult {
  created: string[];
  existing: string[];
  scenes: string[];
}

export const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const TAURI_REQUIRED_MESSAGE =
  "This action needs the desktop app. Run `pnpm tauri dev` instead of `pnpm dev`.";

function assertTauri() {
  if (!isTauri()) {
    throw new Error(TAURI_REQUIRED_MESSAGE);
  }
}

export const projectApi = {
  create: (projectName: string, template: string, savePath: string) => {
    assertTauri();
    return invoke<ProjectInfo>("create_project", {
      projectName,
      template,
      savePath,
    });
  },

  open: (savePath: string) => {
    assertTauri();
    return invoke<ProjectInfo>("open_project", { savePath });
  },

  readScene: (projectPath: string, scene: string) => {
    assertTauri();
    return invoke<string>("read_scene", { projectPath, scene });
  },

  saveScene: (projectPath: string, scene: string, code: string) => {
    assertTauri();
    return invoke<string>("save_scene", { projectPath, scene, code });
  },

  createScene: (projectPath: string, scene: string) => {
    assertTauri();
    return invoke<string[]>("create_scene", { projectPath, scene });
  },

  deleteScene: (projectPath: string, scene: string) => {
    assertTauri();
    return invoke<string[]>("delete_scene", { projectPath, scene });
  },

  /** The scene classes a file declares, which is more than one when the file
   *  is really several scenes that never got split up. */
  sceneClasses: (projectPath: string, scene: string) => {
    assertTauri();
    return invoke<string[]>("scene_classes", { projectPath, scene });
  },

  splitScene: (projectPath: string, scene: string) => {
    assertTauri();
    return invoke<SplitResult>("split_scene", { projectPath, scene });
  },

  render: (projectPath: string, scene: string, quality: RenderQuality) => {
    assertTauri();
    return invoke<RenderResult>("render_scene", { projectPath, scene, quality });
  },

  /** A previous render of this scene, if the project still has one on disk. */
  latestRender: (projectPath: string, scene: string) => {
    assertTauri();
    return invoke<string | null>("latest_render", { projectPath, scene });
  },

  /** Loopback URL for a rendered video. The asset protocol cannot play video on
   *  WebKitGTK, so the preview streams over http instead. */
  media: (path: string) => {
    assertTauri();
    return invoke<string>("media_url", { path });
  },

  reveal: (path: string) => {
    assertTauri();
    return invoke<void>("open_path", { path });
  },
};
