import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { applyThemeToDocument, resolvedThemeAtom, systemThemeAtom } from "@/atoms/theme";

export function ThemeSync() {
  const theme = useAtomValue(resolvedThemeAtom);
  const setSystemTheme = useSetAtom(systemThemeAtom);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return null;
}
