import {
  ArrowLeft01Icon,
  Folder01Icon,
  PlayIcon,
  SaveIcon,
  SidebarLeftIcon,
} from "@hugeicons/core-free-icons";
import { useAtom } from "jotai";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/base-ui/button";
import { Badge } from "@/components/base-ui/badge";
import { SwitchMode } from "@/components/watermelon/switch-mode";
import { sidebarRailOpenAtom } from "@/atoms/projects";
import { useProjectActions } from "@/hooks/useProjectActions";
import { isTauri } from "@/lib/project";

export function TopBar() {
  const { project, isEditing, isDirty, saveScene, render, reveal, closeProject, pickProject } =
    useProjectActions();
  const [railOpen, setRailOpen] = useAtom(sidebarRailOpenAtom);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={railOpen}
          aria-label={railOpen ? "Collapse the sidebar rail" : "Expand the sidebar rail"}
          title={railOpen ? "Collapse the sidebar rail" : "Expand the sidebar rail"}
          onClick={() => setRailOpen(!railOpen)}
        >
          <HugeiconsIcon icon={SidebarLeftIcon} className="size-4" />
        </Button>
        {isEditing && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back to projects"
            onClick={closeProject}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full animate-gradient-xy bg-gradient-to-r from-primary via-fuchsia-500 to-sky-500" />
          <span className="text-sm font-semibold tracking-tight">Manim Studio</span>
        </div>
        {project && (
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-muted-foreground">/</span>
            <span className="truncate text-sm text-muted-foreground">
              {project.name}
            </span>
            <Badge variant="secondary" className="capitalize">
              {project.template}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {project ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Reveal project folder"
              disabled={!isTauri()}
              onClick={() => reveal(project.path)}
            >
              <HugeiconsIcon icon={Folder01Icon} className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveScene()}
              disabled={!isDirty || !isTauri()}
            >
              <HugeiconsIcon icon={SaveIcon} className="size-4" />
              {isDirty ? "Save" : "Saved"}
            </Button>
            <Button size="sm" disabled={!isTauri()} onClick={() => render()}>
              <HugeiconsIcon icon={PlayIcon} className="size-4" />
              Render
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={!isTauri()}
            title={isTauri() ? undefined : "Run pnpm tauri dev to open folders"}
            onClick={pickProject}
          >
            <HugeiconsIcon icon={Folder01Icon} className="size-4" />
            Open project
          </Button>
        )}
        <SwitchMode width={68} height={34} />
      </div>
    </header>
  );
}
