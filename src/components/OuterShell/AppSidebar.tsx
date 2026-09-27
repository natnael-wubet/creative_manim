import { useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import {
  Delete02Icon,
  File01Icon,
  Film01Icon,
  Folder01Icon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/base-ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/base-ui/accordion";
import { MacOSSidebar } from "@/components/watermelon/macos-sidebar";
import { newProjectModalOpenAtom } from "@/atoms/projects";
import { useProjectActions } from "@/hooks/useProjectActions";

const SECTIONS = ["Scenes", "Assets", "Output"] as const;

export function AppSidebar() {
  const setNewProjectOpen = useSetAtom(newProjectModalOpenAtom);
  const [section, setSection] = useState<string>(SECTIONS[0]);
  const [filter, setFilter] = useState("");
  const [newSceneName, setNewSceneName] = useState("");
  const {
    project,
    activeScene,
    renderState,
    selectScene,
    createScene,
    deleteScene,
    isDirty,
    reveal,
  } = useProjectActions();

  const scenes = useMemo(() => {
    const all = project?.scenes ?? [];
    if (!filter.trim()) return all;
    return all.filter((scene) =>
      scene.toLowerCase().includes(filter.trim().toLowerCase()),
    );
  }, [project?.scenes, filter]);

  const openFolder = (relative: string) => {
    if (project) reveal(`${project.path}/${relative}`);
  };

  return (
    <MacOSSidebar
      items={[...SECTIONS]}
      selectedIndex={SECTIONS.indexOf(section as (typeof SECTIONS)[number])}
      onSelect={(item) => setSection(item)}
      className="h-full"
    >
      <div className="flex h-full flex-col gap-4 pr-2 pb-4">
        <Button className="mt-4 w-full" onClick={() => setNewProjectOpen(true)}>
          <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
          New project
        </Button>

        <Accordion
          type="single"
          collapsible
          value={section}
          onValueChange={(value) => value && setSection(value)}
          className="w-full"
        >
          <AccordionItem value="Scenes">
            <AccordionTrigger className="text-xs uppercase tracking-wide text-muted-foreground">
              <span className="flex items-center gap-2">
                <HugeiconsIcon icon={File01Icon} className="size-4" />
                Scenes
              </span>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-1">
              <div className="flex items-center gap-2 rounded-md border border-sidebar-border bg-background px-2 py-1">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <input
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Filter scenes"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              {!project && (
                <p className="py-1 text-sm text-muted-foreground">
                  No project open.
                </p>
              )}

              {project && scenes.length === 0 && (
                <p className="px-2 py-1 text-sm text-muted-foreground">
                  No scenes match “{filter}”.
                </p>
              )}

              {scenes.map((scene) => (
                <div
                  key={scene}
                  className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    activeScene === scene
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-sidebar-accent/60"
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => selectScene(scene)}
                  >
                    <span className="truncate">{scene}.py</span>
                    {isDirty && activeScene === scene && (
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${scene}`}
                    className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={() => deleteScene(scene)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                  </button>
                </div>
              ))}

              {project && (
                <form
                  className="mt-1 flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!newSceneName.trim()) return;
                    createScene(newSceneName.trim());
                    setNewSceneName("");
                  }}
                >
                  <input
                    value={newSceneName}
                    onChange={(event) => setNewSceneName(event.target.value)}
                    placeholder="New scene class"
                    className="w-full rounded-md border border-sidebar-border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button type="submit" size="icon-sm" variant="ghost">
                    <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
                  </Button>
                </form>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="Assets">
            <AccordionTrigger className="text-xs uppercase tracking-wide text-muted-foreground">
              <span className="flex items-center gap-2">
                <HugeiconsIcon icon={Folder01Icon} className="size-4" />
                Assets
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {project ? (
                <button
                  type="button"
                  className="truncate font-mono text-xs text-foreground/80 hover:text-foreground"
                  onClick={() => openFolder("assets")}
                >
                  {project.path}/assets
                </button>
              ) : (
                "Drop images, sounds, and fonts next to your scenes."
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="Output">
            <AccordionTrigger className="text-xs uppercase tracking-wide text-muted-foreground">
              <span className="flex items-center gap-2">
                <HugeiconsIcon icon={Film01Icon} className="size-4" />
                Output
              </span>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              {project ? (
                <>
                  <button
                    type="button"
                    className="truncate text-left font-mono text-xs text-foreground/80 hover:text-foreground"
                    onClick={() => openFolder("media")}
                  >
                    {project.path}/media
                  </button>
                  {renderState.video && (
                    <button
                      type="button"
                      className="truncate text-left font-mono text-xs text-primary hover:underline"
                      onClick={() => reveal(renderState.video!)}
                    >
                      {renderState.video}
                    </button>
                  )}
                </>
              ) : (
                "Rendered videos land in the project media folder."
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </MacOSSidebar>
  );
}
