import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "manimTheme";

export const themePreferenceAtom = atomWithStorage<ThemePreference>(
  THEME_STORAGE_KEY,
  "system",
);

const systemPrefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

export const resolvedThemeAtom = atom<ResolvedTheme>((get) => {
  const preference = get(themePreferenceAtom);
  if (preference === "system") {
    return systemPrefersDark() ? "dark" : "light";
  }
  return preference;
});

export function applyThemeToDocument(theme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}
