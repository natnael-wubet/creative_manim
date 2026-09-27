import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { ArrowRightIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/base-ui/dialog";
import { Button } from "@/components/base-ui/button";
import { Input } from "@/components/base-ui/input";
import { Label } from "@/components/base-ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/base-ui/native-select";
import { newProjectModalOpenAtom } from "@/atoms/projects";
import { useProjectActions } from "@/hooks/useProjectActions";
import { isTauri } from "@/lib/project";

const TEMPLATES = [
  { value: "blank", label: "Blank canvas", description: "An empty scene with a dark background." },
  { value: "math", label: "Mathematics", description: "Title card plus a formula example." },
  { value: "physics", label: "Physics", description: "A moving dot, ready for forces and vectors." },
  { value: "code", label: "Code animation", description: "Syntax highlighted code as a Code mobject." },
] as const;

function NewProjectModal() {
  const [open, setOpen] = useAtom(newProjectModalOpenAtom);
  const { createProject } = useProjectActions();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<string>("blank");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setTemplate("blank");
      setBusy(false);
    }
  }, [open]);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    await createProject(name.trim(), template);
    setBusy(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Creates a folder with project.json, assets/, and a starter scene.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              autoFocus
              placeholder="Fourier explained"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit();
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="project-template">Starter template</Label>
            <NativeSelect
              id="project-template"
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
            >
              {TEMPLATES.map((item) => (
                <NativeSelectOption key={item.value} value={item.value}>
                  {item.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">
              {TEMPLATES.find((item) => item.value === template)?.description}
            </p>
          </div>

          {!isTauri() && (
            <p className="text-xs text-destructive">
              Project creation needs the desktop app: run pnpm tauri dev.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || busy || !isTauri()}>
            {busy ? "Creating…" : "Choose folder and create"}
            {busy ? null : <HugeiconsIcon icon={ArrowRightIcon} className="size-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NewProjectModal;
