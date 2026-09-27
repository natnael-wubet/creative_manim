
import './Editor.module.css'
import { useState } from "react";
import {
  Tabs,
  Paper,
  Text,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Group,
} from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Code2,
  Hand,
  SlidersHorizontal,
  Play,
  Layers,
} from "lucide-react";
import CodeEditor from '../CodeEditor';

/* ── Placeholder Content Components ── */
const CanvasPlaceholder = () => (
  <div className="flex-1 flex items-center justify-center p-4">
    <div className="text-center space-y-3">
      <div className="w-24 h-24 mx-auto rounded-full bg-secondary/50 flex items-center justify-center">
        <Play size={32} className="text-muted-foreground" />
      </div>
      <Text size="sm" color="dimmed" className="font-mono">
        Live Preview
      </Text>
      <Text size="xs" color="dimmed">
        1920 × 1080
      </Text>
    </div>
  </div>
);


const DragDropCanvasPlaceholder = () => (
  <div className="flex-1 flex items-center justify-center p-4">
    <div className="text-center space-y-3">
      <div className="w-24 h-24 mx-auto rounded-xl border-2 border-dashed border-blue-400/50 bg-blue-500/5 flex items-center justify-center">
        <Hand size={32} className="text-blue-400/70" />
      </div>
      <Text size="sm" color="dimmed" className="font-mono">
        Drag & Drop Canvas
      </Text>
      <Text size="xs" color="dimmed">
        Drop objects here to position them
      </Text>
    </div>
  </div>
);

/* ── Properties Panel Content ── */
const PropertiesPanel = () => (
  <div className="p-3 space-y-4">
    <Text size="sm" weight={600} className="text-foreground">
      Inspector
    </Text>
    {["Position", "Scale", "Rotation", "Opacity"].map((prop) => (
      <div key={prop} className="space-y-1">
        <label className="text-xs text-muted-foreground">{prop}</label>
        <div className="h-8 bg-secondary/50 border border-border rounded" />
      </div>
    ))}
    <div className="pt-4">
      <Text size="sm" weight={600} className="text-foreground">
        Layers
      </Text>
      <div className="space-y-1 mt-2">
        {["Layer 1", "Layer 2"].map((layer) => (
          <div key={layer} className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 cursor-pointer">
            <Layers size={14} className="text-muted-foreground" />
            <span className="text-xs text-foreground">{layer}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── Main Editor Component ── */
export default function Editor() {
  const [activeTab, setActiveTab] = useState<string | null>("preview");
  const [showProperties, setShowProperties] = useState(true);
	const [codeText,setCodeText] = useState<string>("");
  return (
    <div className="h-full flex flex-col">
      {/* Top header bar */}
      <Paper
        shadow="xs"
        p="sm"
        className="flex items-center justify-between bg-background border-b border-border shrink-0"
      >
        <Group spacing="xs">
          <div className="h-3 w-3 rounded-full bg-green-400" />
          <Text size="sm" weight={500} className="text-foreground">
            My Amazing Animation
          </Text>
        </Group>

        <Group spacing="xs">
          {/* Toggle Properties panel */}
          <Tooltip label={showProperties ? "Hide Properties" : "Show Properties"}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => setShowProperties((p) => !p)}
            >
              <SlidersHorizontal size={18} />
            </ActionIcon>
          </Tooltip>
          {/* Placeholder actions */}
          <div className="h-8 w-8 rounded-md bg-secondary" />
          <div className="h-8 w-8 rounded-md bg-secondary" />
        </Group>
      </Paper>

      {/* Main workspace area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left content (tabs + content) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs bar */}
          <Paper className="bg-background border-b border-border px-3 pt-1">
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab value="code" leftSection={<Code2 size={14} />}>
                  Code
                </Tabs.Tab>
                <Tabs.Tab value="canvas" leftSection={<Hand size={14} />}>
                  Drag & Drop
                </Tabs.Tab>

                <Tabs.Tab value="preview" leftSection={<Eye size={14} />}>
                  Preview
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </Paper>

          {/* Tab panels */}
          <div className="flex-1 bg-background overflow-hidden">
            {activeTab === "preview" && <CanvasPlaceholder />}
            {activeTab === "code" && <CodeEditor value={codeText} onChange={setCodeText} />}
            {activeTab === "canvas" && <DragDropCanvasPlaceholder />}
          </div>
        </div>

        {/* Properties panel (right) with slide animation */}
        <AnimatePresence>
          {showProperties && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 250, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="border-l border-border bg-background overflow-hidden"
            >
              <ScrollArea className="h-full">
                <PropertiesPanel />
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
