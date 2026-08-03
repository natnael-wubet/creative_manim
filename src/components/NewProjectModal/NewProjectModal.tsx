
import './NewProjectModal.module.css'
import { useState } from "react";
import {
  Modal,
  TextInput,
  Select,
  Button,
  Group,
  Text,
  Paper,
  ActionIcon,
  Input,
} from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  Palette,
  Binary,
  Atom,
  Wand2,
  FolderSearch,
} from "lucide-react";
import { BackgroundBeams } from '../ui/background-beams'; 

import { open } from "@tauri-apps/plugin-dialog"; // Tauri v2 dialog

// Template definitions (no wild colors, only icons)
const templates = [
  { value: "blank", label: "Blank Canvas", icon: Palette },
  { value: "math", label: "Mathematics", icon: Binary },
  { value: "physics", label: "Physics", icon: Atom },
  { value: "code", label: "Code Animation", icon: Wand2 },
];

interface NewProjectModalProps {
  opened: boolean;
  onClose: () => void;
  onCreate?: (name: string, template: string, savePath: string) => void;
}

export function NewProjectModal({
  opened,
  onClose,
  onCreate,
}: NewProjectModalProps) {
  const [projectName, setProjectName] = useState("");
  const [template, setTemplate] = useState<string | null>("blank");
  const [savePath, setSavePath] = useState("");
  const [loading, setLoading] = useState(false);

  // Open native directory picker via Tauri v2
  const pickDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Choose project location",
      });
      if (selected) {
        // In Tauri v2, selected is `string | null`, we cast it safely
        setSavePath(selected as string);
      }
    } catch (error) {
      console.error("Directory picker error:", error);
    }
  };

  const handleCreate = async () => {
    if (!projectName.trim() || !savePath) return;
    setLoading(true);
    // Simulate a brief delay for smooth UX
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLoading(false);
    onCreate?.(projectName, template || "blank", savePath);
    // Reset form
    setProjectName("");
    setTemplate("blank");
    setSavePath("");
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!loading) {
          setProjectName("");
          setTemplate("blank");
          setSavePath("");
          onClose();
        }
      }}
      centered
      size="lg"
      overlayProps={{
        blur: 6,
        backgroundOpacity: 0.55,
      }}
      withCloseButton={false}
      padding={0}
      radius="lg"
      styles={{
        content: { background: "transparent", boxShadow: "none" },
        body: { padding: 0 },
      }}
    >
      <div className="relative w-full overflow-hidden rounded-xl">
        {/* Ambient beams – only moving background element */}
        <BackgroundBeams className="absolute inset-0 z-0 opacity-20" />

        {/* Animated gradient border – slow rotation */}
        <div className="relative z-10 p-[1.5px] rounded-xl">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#2c2e33] via-[#4dabf7] to-[#2c2e33] animate-gradient-xy opacity-70" />

          <Paper
            radius="lg"
            className="relative bg-[#f8f9fa] dark:bg-[#1a1b1e] p-8 md:p-10 shadow-2xl"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Header */}
                <Group spacing="sm" mb="xs">
                  <FolderOpen
                    size={28}
                    className="text-[#4dabf7] dark:text-[#74c0fc]"
                    strokeWidth={1.8}
                  />
                  <Text size="xl" weight={700} className="text-2xl">
                    New Project
                  </Text>
                </Group>
                <Text size="sm" color="dimmed" mb="lg" ml={38}>
                  Start fresh and bring a new idea to life.
                </Text>

                {/* Project name */}
                <TextInput
                  label="Project name"
                  placeholder="Untitled Project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.currentTarget.value)}
                  required
                  size="md"
                  mb="md"
                  autoFocus
                />

                {/* Directory picker */}
                <Input.Wrapper label="Save location" required mb="md">
                  <div className="flex gap-2">
                    <TextInput
                      placeholder="Select a folder..."
                      value={savePath}
                      onChange={(e) => setSavePath(e.currentTarget.value)}
                      size="md"
                      style={{ flex: 1 }}
                      rightSection={
                        savePath && (
                          <ActionIcon
                            onClick={() => setSavePath("")}
                            variant="subtle"
                            color="gray"
                          >
                            ✕
                          </ActionIcon>
                        )
                      }
                    />
                    <Button
                      onClick={pickDirectory}
                      variant="outline"
                      size="md"
                      leftIcon={<FolderSearch size={18} />}
                    >
                      Browse
                    </Button>
                  </div>
                </Input.Wrapper>

                {/* Template selector */}
                <Select
                  label="Template (optional)"
                  placeholder="Choose a starting point"
                  value={template}
                  onChange={setTemplate}
                  data={templates.map((t) => ({
                    value: t.value,
                    label: t.label,
                  }))}
                  size="md"
                  mb="xl"
                  icon={
                    template
                      ? (() => {
                          const Tpl = templates.find(
                            (t) => t.value === template
                          )?.icon;
                          return Tpl ? (
                            <Tpl size={18} className="text-[#4dabf7]" />
                          ) : null;
                        })()
                      : null
                  }
                />

                {/* Buttons */}
                <Group position="right">
                  <Button
                    variant="subtle"
                    color="gray"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    loading={loading}
                    disabled={!projectName.trim() || !savePath}
                    radius="md"
                    variant="filled"
                    className="bg-[#1c7ed6] hover:bg-[#1971c2] dark:bg-[#4dabf7] dark:hover:bg-[#339af0] text-white font-medium transition-colors"
                    leftIcon={!loading ? <FolderOpen size={18} /> : undefined}
                  >
                    Create Project
                  </Button>
                </Group>
              </motion.div>
            </AnimatePresence>
          </Paper>
        </div>
      </div>
    </Modal>
  );
}
