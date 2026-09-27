import { useAtom } from "jotai";
import { useEffect } from "react";
import { Outlet } from "react-router";
import { ThemeSync } from "@/components/ThemeSync";
import { sidebarRailOpenAtom } from "@/atoms/projects";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

/** Below this the 240px rail squeezes the editor, so it folds away. */
const NARROW = "(max-width: 1279px)";

/**
 * The Watermelon rail is a fixed 240px when it is open and 65px when it is
 * folded, and the shell wraps it in `p-2` (16px) + `p-3` (24px) with a
 * `pl-4`/`pr-2` gutter inside the content pane. These widths are sized so the
 * scene names keep a usable column at the 960px minimum window size:
 *   collapsed 330 = 16 + 24 + 65 + 16 + 8 + ~200 of scene list
 *   expanded  500 = 16 + 24 + 240 + 16 + 8 + ~200 of scene list
 */

function OuterShell() {
  const [railOpen, setRailOpen] = useAtom(sidebarRailOpenAtom);
  const isNarrow = useMediaQuery(NARROW);

  // Fold the rail whenever the window crosses into or out of the narrow range.
  // A manual toggle after that still wins until the next crossing, so the user
  // is never fighting an effect that keeps overriding them.
  useEffect(() => {
    setRailOpen(!isNarrow);
  }, [isNarrow, setRailOpen]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <ThemeSync />
      <TopBar />
      <div className="flex min-h-0 flex-1">
        {/* The window can be 960px wide, so the sidebar narrows rather than
            disappearing. Only the rail folds; the scene explorer stays. */}
        <aside
          data-sidebar={railOpen ? "expanded" : "collapsed"}
          className={`shrink-0 p-2 transition-[width] duration-200 ease-out ${
            railOpen ? "w-[500px] xl:w-[520px]" : "w-[330px] xl:w-[360px]"
          }`}
        >
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
