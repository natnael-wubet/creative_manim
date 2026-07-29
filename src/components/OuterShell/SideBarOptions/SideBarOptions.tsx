import { FolderTree, Clapperboard, Wrench, Play, ChevronRight } from "lucide-react";
import { Accordion } from "@mantine/core";
import styles from "./SideBarOptions.module.css";

const SideBarOptions: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      {/* Explorer header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/60 select-none">
          Explorer
        </span>
        <FolderTree size={14} className="text-sidebar-foreground/40" />
      </div>

      {/* Accordion tree */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <Accordion
          multiple
          variant="filled"
          classNames={{
            root: styles.accordionRoot,
            item: styles.accordionItem,
            control: styles.accordionControl,
            panel: styles.accordionPanel,
            chevron: styles.accordionChevron,
          }}
        >
          {/* ── Scenes ── */}
          <Accordion.Item value="scenes">
            <Accordion.Control>
              <div className="flex items-center w-full gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-violet-500/10 ring-1 ring-violet-500/20 shrink-0">
                  <Clapperboard size={14} className="text-violet-400" />
                </div>
                <span className="flex-1 text-left text-[13px] font-medium text-sidebar-foreground">
                  Scenes
                </span>
                <span className="text-[10px] font-semibold text-sidebar-foreground/40 px-1.5 py-0.5 rounded-md bg-sidebar-accent/60 min-w-[20px] text-center">
                  0
                </span>
              </div>
            </Accordion.Control>
            <Accordion.Panel>
              <div className="flex flex-col gap-0.5 pl-10 pr-1">
                <p className="text-xs text-sidebar-foreground/50 italic py-2 px-1">
                  No scenes yet
                </p>
              </div>
            </Accordion.Panel>
          </Accordion.Item>

          {/* ── Assets ── */}
          <Accordion.Item value="assets">
            <Accordion.Control>
              <div className="flex items-center w-full gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/10 ring-1 ring-amber-500/20 shrink-0">
                  <Wrench size={14} className="text-amber-400" />
                </div>
                <span className="flex-1 text-left text-[13px] font-medium text-sidebar-foreground">
                  Assets
                </span>
                <span className="text-[10px] font-semibold text-sidebar-foreground/40 px-1.5 py-0.5 rounded bg-sidebar-accent/25 min-w-[20px] text-center">
                  0
                </span>
              </div>
            </Accordion.Control>
            <Accordion.Panel>
              <div className="flex flex-col gap-0.5 pl-10 pr-1">
                <p className="text-xs text-sidebar-foreground/50 italic py-2 px-1">
                  No assets yet
                </p>
              </div>
            </Accordion.Panel>
          </Accordion.Item>

          {/* ── Builds ── */}
          <Accordion.Item value="builds">
            <Accordion.Control>
              <div className="flex items-center w-full gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/20 shrink-0">
                  <Play size={14} className="text-emerald-400" />
                </div>
                <span className="flex-1 text-left text-[13px] font-medium text-sidebar-foreground">
                  Builds
                </span>
                <span className="text-[10px] font-semibold text-sidebar-foreground/40 px-1.5 py-0.5 rounded bg-sidebar-accent/25 min-w-[20px] text-center">
                  0
                </span>
              </div>
            </Accordion.Control>
            <Accordion.Panel>
              <div className="flex flex-col gap-0.5 pl-10 pr-1">
                <p className="text-xs text-sidebar-foreground/50 italic py-2 px-1">
                  No builds yet
                </p>
              </div>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-amber-500 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-sidebar-foreground truncate">
              Draft
            </span>
            <span className="text-[10px] text-sidebar-foreground/50">
              Unsaved
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideBarOptions;
