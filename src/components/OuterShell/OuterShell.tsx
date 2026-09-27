import { Outlet } from "react-router";
import { ThemeSync } from "@/components/ThemeSync";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

function OuterShell() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <ThemeSync />
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[520px] shrink-0 p-2 lg:block">
          <AppSidebar />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default OuterShell;
