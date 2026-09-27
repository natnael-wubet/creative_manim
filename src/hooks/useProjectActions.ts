import { open } from "@tauri-apps/plugin-dialog";
import { useAtom } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  activeSceneAtom,
  currentProjectAtom,
  dirtyScenesAtom,
  isEditingAtom,
  recentProjectsAtom,
  renderQualityAtom,
  renderStateAtom,
  sceneClassNamesAtom,
  sceneCodeAtom,
  type ProjectInfo,
  type RenderQuality,
} from "@/atoms/projects";
import { projectApi, TAURI_REQUIRED_MESSAGE } from "@/lib/project";

function sameClasses(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((name, index) => name === b[index]);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong.";
}

export function useProjectActions() {
  const [project, setProject] = useAtom(currentProjectAtom);
  const [isEditing, setIsEditing] = useAtom(isEditingAtom);
  const [activeScene, setActiveScene] = useAtom(activeSceneAtom);
  const [codeMap, setCodeMap] = useAtom(sceneCodeAtom);
  const [dirty, setDirty] = useAtom(dirtyScenesAtom);
  const [quality, setQuality] = useAtom(renderQualityAtom);
  const [renderState, setRenderState] = useAtom(renderStateAtom);
  const [recents, setRecents] = useAtom(recentProjectsAtom);
  const [, setSceneClasses] = useAtom(sceneClassNamesAtom);

  const remember = (info: ProjectInfo) => {
    const entry = {
      id: info.path,
      name: info.name,
      path: info.path,
      template: info.template,
      lastOpened: new Date().toISOString(),
    };
    setRecents([entry, ...recents.filter((p) => p.id !== entry.id)].slice(0, 8));
  };

  const loadProject = async (info: ProjectInfo) => {
    setProject(info);
    setActiveScene(info.scenes[0] ?? null);
    setDirty({});
    setCodeMap({});
    setRenderState({ status: "idle", log: "", video: null, scene: null });
    remember(info);
    setIsEditing(true);
  };

  const openProjectPath = async (path: string) => {
    try {
      const info = await projectApi.open(path);
      await loadProject(info);
      if (info.scenes.length > 0) {
        await selectScene(info.scenes[0], info);
      }
      toast.success(`Opened ${info.name}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const pickProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Open Manim project",
      });
      if (typeof selected === "string") {
        await openProjectPath(selected);
      }
    } catch (error) {
      toast.error(error === null ? TAURI_REQUIRED_MESSAGE : errorMessage(error));
    }
  };

  const createProject = async (name: string, template: string) => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Choose where to create the project",
      });
      if (typeof selected !== "string") return;

      const info = await projectApi.create(name, template, selected);
      await loadProject(info);
      if (info.scenes.length > 0) {
        await selectScene(info.scenes[0], info);
      }
      toast.success(`Created ${info.name}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const readSceneCode = async (scene: string, info: ProjectInfo = project!) => {
    if (!info) return;
    const code = await projectApi.readScene(info.path, scene);
    setCodeMap((prev) => ({ ...prev, [scene]: code }));
  };

  /** Show whatever is already on disk for a scene, so the preview is useful
   *  before anyone pays for a render. Driven by an effect in the Editor, which
   *  is the only thing that mounts once; putting it here would run per consumer. */
  const showLastRender = useCallback(
    async (scene: string, info: ProjectInfo) => {
      try {
        const video = await projectApi.latestRender(info.path, scene);
        setRenderState((prev) =>
          // A render that is running or just finished owns the preview.
          prev.scene === scene
            ? prev
            : video
              ? {
                  status: "ok",
                  log: `Showing the last render of ${scene}. Render again to refresh it.`,
                  video,
                  scene,
                }
              : { status: "idle", log: "", video: null, scene: null },
        );
      } catch {
        // No previous render is the normal case, not worth a toast.
      }
    },
    [setRenderState],
  );

  const selectScene = async (scene: string, info: ProjectInfo = project!) => {
    setActiveScene(scene);
    if (info && !(scene in codeMap)) {
      try {
        await readSceneCode(scene, info);
      } catch (error) {
        toast.error(errorMessage(error));
      }
    }
  };

  const updateCode = (scene: string, code: string) => {
    setCodeMap((prev) => ({ ...prev, [scene]: code }));
    setDirty((prev) => ({ ...prev, [scene]: true }));
  };

  const saveScene = async (scene: string = activeScene!) => {
    if (!project || !scene) return;
    try {
      await projectApi.saveScene(project.path, scene, codeMap[scene] ?? "");
      setDirty((prev) => ({ ...prev, [scene]: false }));
      toast.success(`Saved ${scene}.py`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const createScene = async (name: string) => {
    if (!project) return;
    try {
      const before = new Set(project.scenes);
      const scenes = await projectApi.createScene(project.path, name);
      setProject({ ...project, scenes });
      toast.success(`Added ${name}`);
      // The backend derives a valid class name from the typed text, so
      // "third scene" lands on disk as `Third.py`. Select the stem the list
      // actually reports instead of echoing back what was typed.
      const created = scenes.find((scene) => !before.has(scene)) ?? name;
      await selectScene(created);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const deleteScene = async (scene: string) => {
    if (!project) return;
    if (project.scenes.length <= 1) {
      toast.error("A project needs at least one scene.");
      return;
    }
    try {
      const scenes = await projectApi.deleteScene(project.path, scene);
      setProject({ ...project, scenes });
      if (activeScene === scene) {
        const next = scenes[0];
        setActiveScene(next);
        if (next) await readSceneCode(next);
      }
      toast.success(`Deleted ${scene}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  /** The scene classes the active file declares, so the UI can tell whether a
   *  file is really several scenes. */
  const loadSceneClasses = useCallback(
    async (scene: string, info: ProjectInfo) => {
      try {
        const classes = await projectApi.sceneClasses(info.path, scene);
        setSceneClasses((prev) => (sameClasses(prev, classes) ? prev : classes));
      } catch {
        setSceneClasses([]);
      }
    },
    [setSceneClasses],
  );

  const splitScene = async (scene: string = activeScene!) => {
    if (!project || !scene) return;
    try {
      const result = await projectApi.splitScene(project.path, scene);
      setProject({ ...project, scenes: result.scenes });
      await loadSceneClasses(scene, project);
      const parts = [
        `${result.created.length} scene file${result.created.length === 1 ? "" : "s"} created`,
        result.existing.length > 0 ? `${result.existing.length} already existed` : null,
        `${scene}.py was left in place`,
      ].filter(Boolean);
      toast.success(`Split ${scene}.py`, { description: parts.join(" · ") });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const render = async (scene: string = activeScene!, level: RenderQuality = quality) => {
    if (!project || !scene) return;
    setRenderState({ status: "running", log: "Rendering…", video: null, scene });
    try {
      const result = await projectApi.render(project.path, scene, level);
      setRenderState({
        status: result.ok ? "ok" : "error",
        log: result.output,
        video: result.video,
        scene,
      });
      if (result.ok) {
        toast.success(`Rendered ${scene} (${level})`);
      } else {
        toast.error("Render failed — see the console output.");
      }
    } catch (error) {
      setRenderState({ status: "error", log: errorMessage(error), video: null, scene });
      toast.error(errorMessage(error));
    }
  };

  const reveal = async (path: string) => {
    try {
      await projectApi.reveal(path);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const closeProject = () => {
    setIsEditing(false);
    setProject(null);
    setActiveScene(null);
    setCodeMap({});
    setDirty({});
    setRenderState({ status: "idle", log: "", video: null, scene: null });
  };

  return {
    project,
    isEditing,
    activeScene,
    code: activeScene ? (codeMap[activeScene] ?? "") : "",
    isDirty: activeScene ? Boolean(dirty[activeScene]) : false,
    dirty,
    quality,
    setQuality,
    renderState,
    recents,
    createProject,
    pickProject,
    openProjectPath,
    selectScene,
    updateCode,
    saveScene,
    createScene,
    deleteScene,
    splitScene,
    loadSceneClasses,
    showLastRender,
    render,
    reveal,
    closeProject,
  };
}
