import { useEffect } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Alert02Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@/components/base-ui/badge";
import { Button } from "@/components/base-ui/button";
import { Label } from "@/components/base-ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/base-ui/native-select";
import { ScrollArea } from "@/components/base-ui/scroll-area";
import { Separator as Divider } from "@/components/base-ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/base-ui/tabs";
import CodeEditor from "@/components/CodeEditor/CodeEditor";
import VideoPlayer from "@/components/Editor/VideoPlayer";
import { useProjectActions } from "@/hooks/useProjectActions";
import { isTauri } from "@/lib/project";

const QUALITIES = [
  { value: "low", label: "Low — 480p15" },
  { value: "medium", label: "Medium — 720p30" },
  { value: "high", label: "High — 1080p60" },
  { value: "production", label: "Production — 1440p60" },
] as const;

function Editor() {
  const {
    project,
    activeScene,
    code,
    isDirty,
    quality,
    setQuality,
    renderState,
    updateCode,
    saveScene,
    render,
    reveal,
    showLastRender,
  } = useProjectActions();

  // Restore the preview from whatever is already on disk. Keyed on the project
  // object rather than its path so reopening a project reloads it even when the
  // first scene is the same one that was active before.
  useEffect(() => {
    if (activeScene && project) {
      void showLastRender(activeScene, project);
    }
  }, [activeScene, project, showLastRender]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveScene();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveScene]);

  if (!project) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{activeScene}.py</span>
          {isDirty && (
            <Badge variant="outline" className="text-[10px]">
              unsaved
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Save with <kbd className="font-mono">⌘/Ctrl + S</kbd>
        </p>
      </div>

      <Group orientation="horizontal" className="min-h-0 flex-1">
        <Panel defaultSize={55} minSize={30}>
          <div className="h-full min-h-0">
            <CodeEditor
              value={code}
              onChange={(value) => activeScene && updateCode(activeScene, value)}
            />
          </div>
        </Panel>

        <Separator className="w-px shrink-0 bg-border transition-colors hover:bg-primary" />

        <Panel defaultSize={45} minSize={25}>
          <Tabs defaultValue="preview" className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="console">Console</TabsTrigger>
              </TabsList>
              <Button
                size="sm"
                disabled={!isTauri() || renderState.status === "running"}
                onClick={() => render()}
              >
                <HugeiconsIcon icon={PlayIcon} className="size-4" />
                Render
              </Button>
            </div>

            <TabsContent value="preview" className="min-h-0 flex-1 p-3">
              {renderState.video && isTauri() ? (
                <VideoPlayer path={renderState.video} onReveal={reveal} />
              ) : (
                <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border text-center">
                  <HugeiconsIcon
                    icon={renderState.status === "error" ? Alert02Icon : PlayIcon}
                    className="size-6 text-muted-foreground"
                  />
                  <p className="max-w-xs text-sm text-muted-foreground">
                    {renderState.status === "running"
                      ? "Rendering the scene…"
                      : "Render a scene to preview the video here."}
                  </p>
                  {renderState.video && (
                    <Button variant="outline" size="sm" onClick={() => reveal(renderState.video!)}>
                      Reveal output
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="console" className="min-h-0 flex-1 p-0">
              <ScrollArea className="h-full">
                <pre className="whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                  {renderState.log || "No render output yet."}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Panel>
      </Group>

      <Divider />

      <div className="grid gap-3 px-4 py-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="render-quality">Render quality</Label>
          <NativeSelect
            id="render-quality"
            value={quality}
            onChange={(event) => setQuality(event.target.value as typeof quality)}
          >
            {QUALITIES.map((item) => (
              <NativeSelectOption key={item.value} value={item.value}>
                {item.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="grid gap-1.5">
          <Label>Project folder</Label>
          <p className="truncate rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
            {project.path}
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label>Output</Label>
          <p className="truncate rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
            {renderState.video ?? "media/videos/…"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Editor;
