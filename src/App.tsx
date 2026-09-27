import { useAtom } from "jotai";
import { Route, Routes } from "react-router";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/base-ui/tooltip";
import { ThemeSync } from "@/components/ThemeSync";
import OuterShell from "@/components/OuterShell";
import Home from "@/components/Home";
import Editor from "@/components/Editor";
import { isEditingAtom } from "@/atoms/projects";

function App() {
  const [isEditing] = useAtom(isEditingAtom);

  return (
    <TooltipProvider>
      <ThemeSync />
      <main className="bg-background text-foreground h-full overflow-hidden">
        <Routes>
          <Route path="/" element={<OuterShell />}>
            <Route index element={!isEditing ? <Home /> : <Editor />} />
          </Route>
        </Routes>
      </main>
      <Toaster
        position="bottom-right"
        theme="system"
        toastOptions={{
          classNames: {
            toast: "!rounded-xl !border-border !bg-card !text-card-foreground",
          },
        }}
      />
    </TooltipProvider>
  );
}

export default App;
