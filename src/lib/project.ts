import { invoke } from "@tauri-apps/api/core";
import type { ProjectInfo, RenderQuality } from "@/atoms/projects";

export interface RenderResult {
  ok: boolean;
  output: string;
  video: string | null;
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

  render: (projectPath: string, scene: string, quality: RenderQuality) => {
    assertTauri();
    return invoke<RenderResult>("render_scene", { projectPath, scene, quality });
  },

  reveal: (path: string) => {
    assertTauri();
    return invoke<void>("open_path", { path });
  },
};
