
import './Editor.module.css'
import { Paper, Text } from "@mantine/core";
import { motion } from "framer-motion";

export default function Editor() {
  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top bar: project name + quick actions */}
      <Paper
        shadow="xs"
        p="sm"
        className="flex items-center justify-between bg-background border-b border-border"
      >
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-green-400" />
          <Text size="sm" weight={500} className="text-foreground">
            My Amazing Animation
          </Text>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-md bg-secondary" />
          <div className="h-8 w-8 rounded-md bg-secondary" />
          <div className="h-8 w-8 rounded-md bg-secondary" />
        </div>
      </Paper>

      {/* Main editor area – canvas placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex gap-4 px-2"
      >
        {/* Main canvas (center) */}
        <div className="flex-1 bg-secondary/50 rounded-xl border border-border flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/20" />
          <div className="relative z-10 text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-secondary border border-border flex items-center justify-center">
              <div className="w-12 h-12 rounded bg-muted-foreground/30" />
            </div>
            <Text size="sm" color="dimmed" className="font-mono">
              canvas area
            </Text>
            <Text size="xs" color="dimmed" className="mt-1 opacity-60">
              1920 × 1080
            </Text>
          </div>
        </div>

        {/* Right sidebar – properties / inspector */}
        <Paper
          shadow="xs"
          className="w-64 bg-background border border-border rounded-xl p-4 space-y-4"
        >
          <Text size="sm" weight={600} className="text-foreground">
            Properties
          </Text>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-20 rounded bg-secondary" />
              <div className="h-8 w-full rounded-md bg-secondary/50 border border-border" />
            </div>
          ))}
        </Paper>
      </motion.div>

      {/* Bottom bar – timeline placeholder */}
      <Paper
        shadow="xs"
        p="sm"
        className="bg-background border-t border-border"
      >
        <div className="flex items-center gap-4">
          <div className="h-8 w-20 rounded-md bg-secondary flex items-center justify-center">
            <Text size="xs" color="dimmed">0:00</Text>
          </div>
          <div className="flex-1 h-8 bg-secondary/50 rounded-md border border-border relative">
            <div className="absolute left-1/3 top-0 bottom-0 w-[2px] bg-blue-500/70" />
            <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-blue-500/10 rounded-l-md" />
          </div>
          <div className="h-8 w-16 rounded-md bg-secondary flex items-center justify-center">
            <Text size="xs" color="dimmed">30s</Text>
          </div>
        </div>
      </Paper>
    </div>
  );
}
