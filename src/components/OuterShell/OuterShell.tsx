import { AppShell, Burger } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet } from "react-router";
import { Film, Settings } from "lucide-react";
import SideBarOptions from "./SideBarOptions/SideBarOptions";

const OuterShell: React.FC = () => {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
    >
      {/* ── Header ── */}
      <AppShell.Header className="flex items-center px-4 border-b border-border bg-gradient-to-r from-sidebar via-background to-background">
        <Burger
          opened={opened}
          onClick={toggle}
          hiddenFrom="sm"
          size="sm"
          className="mr-3"
        />
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600 shadow-md shadow-violet-500/20">
            <Film size={18} className="text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Manim Studio
            </span>
            <span className="text-[10px] text-muted-foreground tracking-wide uppercase">
              Creative Animation
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors duration-200">
            <Settings size={14} />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </AppShell.Header>

      {/* ── Navbar ── */}
      <AppShell.Navbar className="bg-sidebar border-r border-sidebar-border">
        <SideBarOptions />
      </AppShell.Navbar>

      {/* ── Main ── */}
      <AppShell.Main className="bg-background">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};

export default OuterShell;
