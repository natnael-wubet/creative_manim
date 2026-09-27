import { motion } from "motion/react";
import { Folder01Icon, PlayCircleIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAtom } from "jotai";
import { Badge } from "@/components/base-ui/badge";
import { Button } from "@/components/base-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/base-ui/card";
import { ShimmerButton } from "@/components/watermelon/shimmer-button";
import { newProjectModalOpenAtom } from "@/atoms/projects";
import { useProjectActions } from "@/hooks/useProjectActions";
import { isTauri } from "@/lib/project";

const FEATURES = [
  {
    icon: SparklesIcon,
    title: "Scene first",
    description: "Each scene is a plain Python file you can diff, review, and version.",
  },
  {
    icon: PlayCircleIcon,
    title: "Render in place",
    description: "Manim renders straight from the project folder into media/videos.",
  },
  {
    icon: Folder01Icon,
    title: "Plain folders",
    description: "Your project is just scenes/ and assets/ on disk. No database.",
  },
];

function Home() {
  const { recents, openProjectPath, pickProject } = useProjectActions();
  const [, setNewProjectOpen] = useAtom(newProjectModalOpenAtom);

  return (
    <div className="relative min-h-full overflow-y-auto">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 to-transparent" />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-12 px-6 py-16">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-start gap-6"
        >
          <Badge variant="secondary" className="gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
            Manim Community v0.20
          </Badge>

          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Explain math with{" "}
            <span className="animate-gradient-xy bg-gradient-to-r from-primary via-fuchsia-500 to-sky-500 bg-clip-text text-transparent">
              animation
            </span>
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground">
            Write Manim scenes in a real editor, render them to video, and keep
            every project as a folder you own.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <ShimmerButton onClick={() => setNewProjectOpen(true)}>
              <span className="flex items-center gap-2">
                <HugeiconsIcon icon={SparklesIcon} className="size-4" />
                New project
              </span>
            </ShimmerButton>
            <Button variant="outline" size="lg" onClick={pickProject}>
              <HugeiconsIcon icon={Folder01Icon} className="size-4" />
              Open project
            </Button>
          </div>

          {!isTauri() && (
            <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Running in a plain browser: file and render actions need{" "}
              <code className="font-mono">pnpm tauri dev</code>.
            </p>
          )}
        </motion.section>

        <section className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
            >
              <Card className="h-full">
                <CardHeader>
                  <HugeiconsIcon
                    icon={feature.icon}
                    className="size-5 text-primary"
                  />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Recent projects
          </h2>
          {recents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects yet. Create one to generate your first scene.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recents.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => openProjectPath(project.path)}
                  className="group flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/50"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{project.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {project.path}
                    </span>
                  </span>
                  <Badge variant="secondary" className="capitalize">
                    {project.template}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Home;
