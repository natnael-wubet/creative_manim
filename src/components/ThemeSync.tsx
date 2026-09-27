import { useEffect } from "react";
import { useAtomValue } from "jotai";
import { applyThemeToDocument, resolvedThemeAtom } from "@/atoms/theme";

export function ThemeSync() {
  const theme = useAtomValue(resolvedThemeAtom);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeToDocument(theme);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return null;
}
