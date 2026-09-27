"use client";

import { PlusSignIcon, SidebarLeftIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, AnimatePresence } from "motion/react";
import { useState, type ReactNode } from "react";

export interface MacOSSidebarProps {
  items: string[];
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialSelectedIndex?: number;
  selectedIndex?: number;
  onSelect?: (item: string, index: number) => void;
  children?: ReactNode;
  className?: string;
}

export function MacOSSidebar({
  items,
  defaultOpen = true,
  open,
  onOpenChange,
  initialSelectedIndex = 0,
  selectedIndex: controlledSelectedIndex,
  onSelect,
  children,
  className = "",
}: MacOSSidebarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [internalSelectedIndex, setInternalSelectedIndex] =
    useState<number>(initialSelectedIndex);
  const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpen);

  const selectedIndex = controlledSelectedIndex ?? internalSelectedIndex;
  const isOpen = open ?? internalOpen;

  const toggleOpen = () => {
    const next = !isOpen;
    setInternalOpen(next);
    onOpenChange?.(next);
  };

  const select = (index: number) => {
    setInternalSelectedIndex(index);
    onSelect?.(items[index], index);
  };

  return (
    <div
      className={`flex bg-sidebar rounded-3xl p-3 relative w-full min-w-0 overflow-hidden ${className}`}
    >
      <motion.div
        animate={{
          width: isOpen ? 240 : 64,
        }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
        className={`p-2 rounded-2xl shrink-0 flex flex-col items-start transition-colors duration-900 ease-out ${
          isOpen ? "bg-sidebar-accent" : "bg-transparent"
        }`}
      >
        <div
          className={`flex items-center w-full ${
            isOpen ? "justify-end gap-4" : "justify-center"
          } text-sidebar-foreground p-2 shrink-0`}
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  className="size-5 cursor-pointer"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            layout
            className="shrink-0 flex items-center justify-center"
          >
            <button
              type="button"
              onClick={toggleOpen}
              aria-expanded={isOpen}
              aria-label={
                isOpen ? "Collapse the section rail" : "Expand the section rail"
              }
              className="rounded-md p-1 text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <HugeiconsIcon icon={SidebarLeftIcon} className="size-5 cursor-pointer" />
            </button>
          </motion.div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col gap-2 mt-4 w-full relative z-10 whitespace-nowrap"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {items.map((item, index) => (
                <div
                  key={item}
                  className="relative cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onClick={() => select(index)}
                >
                  <AnimatePresence>
                    {selectedIndex === index && (
                      <motion.div
                        className="absolute inset-0 z-0 bg-sidebar-accent rounded-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    )}
                  </AnimatePresence>
                  <p
                    className={`relative z-10 px-5 py-3 tracking-tight ${
                      selectedIndex === index
                        ? "text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/60"
                    }`}
                  >
                    {item}
                  </p>
                  <AnimatePresence>
                    {hoveredIndex === index && selectedIndex !== index && (
                      <motion.span
                        layoutId="sidebar-hover-bg"
                        className="absolute inset-0 z-0 bg-sidebar-accent/60 rounded-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 30,
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex-1 w-full h-full min-h-0 overflow-y-auto z-0 pl-4 lg:pl-8">
        {children}
      </div>
    </div>
  );
}
