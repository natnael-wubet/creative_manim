import { useAtomValue, useSetAtom } from "jotai";
import {
  resolvedThemeAtom,
  themePreferenceAtom,
  type ResolvedTheme,
  type ThemePreference,
} from "@/atoms/theme";

export function useTheme() {
  const theme = useAtomValue(resolvedThemeAtom);
  const preference = useAtomValue(themePreferenceAtom);
  const setPreference = useSetAtom(themePreferenceAtom);

  const setTheme = (next: ThemePreference) => setPreference(next);
  const toggleTheme = () =>
    setPreference(theme === "dark" ? "light" : "dark");

  return { theme, preference, setTheme, toggleTheme };
}

export function useResolvedTheme(): ResolvedTheme {
  return useAtomValue(resolvedThemeAtom);
}
