import { useEffect } from "react";
import { useMantineColorScheme } from "@mantine/core";

export function ThemeSync() {
  const { colorScheme } = useMantineColorScheme();

  useEffect(() => {
    const root = document.documentElement;
    if (colorScheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [colorScheme]);

  return null; // invisible, just runs the effect
}
