import { useAtom } from "jotai";
import { Route, Routes } from "react-router";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/base-ui/tooltip";
import OuterShell from "@/components/OuterShell";
import Home from "@/components/Home";
import Editor from "@/components/Editor";
import NewProjectModal from "@/components/NewProjectModal";
import { isEditingAtom } from "@/atoms/projects";
import { useTheme } from "@/hooks/useTheme";
import "@/index.css";

function App() {
  const [isEditing] = useAtom(isEditingAtom);
  const { theme } = useTheme();

  return (
    <TooltipProvider>
      <Routes>
        <Route path="/" element={<OuterShell />}>
          <Route index element={!isEditing ? <Home /> : <Editor />} />
        </Route>
      </Routes>
      <NewProjectModal />
      <Toaster
        position="bottom-right"
        theme={theme}
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
