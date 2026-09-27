import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  template: string;
  lastOpened: string; // ISO date
}

export interface ProjectInfo {
  name: string;
  template: string;
  created: string;
  path: string;
  scenes: string[];
}

export type RenderQuality = "low" | "medium" | "high" | "production";

export interface RenderState {
  status: "idle" | "running" | "ok" | "error";
  log: string;
  video: string | null;
  scene: string | null;
}

export const isEditingAtom = atomWithStorage<boolean>("isEditingState", false);

export const recentProjectsAtom = atomWithStorage<RecentProject[]>("recentProjects", []);

export const currentProjectAtom = atomWithStorage<ProjectInfo | null>("currentProject", null);

export const activeSceneAtom = atomWithStorage<string | null>("activeScene", null);

export const sceneCodeAtom = atom<Record<string, string>>({});

export const dirtyScenesAtom = atom<Record<string, boolean>>({});

export const newProjectModalOpenAtom = atom<boolean>(false);

export const openProjectModalOpenAtom = atom<boolean>(false);

export const renderQualityAtom = atomWithStorage<RenderQuality>("renderQuality", "low");

/** Whether the sidebar rail shows its section labels. Collapsing keeps the
 *  scene explorer on screen, which matters in a narrow window. */
export const sidebarRailOpenAtom = atomWithStorage<boolean>("sidebarRailOpen", true);

export const renderStateAtom = atom<RenderState>({
  status: "idle",
  log: "",
  video: null,
  scene: null,
});

/** Scene classes declared by the active scene's file. More than one means the
 *  file is really several scenes and can be split apart. */
export const sceneClassNamesAtom = atom<string[]>([]);
