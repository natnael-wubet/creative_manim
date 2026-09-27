import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "manimTheme";

export const themePreferenceAtom = atomWithStorage<ThemePreference>(
  THEME_STORAGE_KEY,
  "system",
);

const getSystemTheme = (): ResolvedTheme =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

export const systemThemeAtom = atom<ResolvedTheme>(getSystemTheme());

export const resolvedThemeAtom = atom<ResolvedTheme>((get) => {
  const preference = get(themePreferenceAtom);
  return preference === "system" ? get(systemThemeAtom) : preference;
});

export function applyThemeToDocument(theme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}
