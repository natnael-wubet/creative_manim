import { useEffect, useState } from "react";

/** Tracks a media query so the layout can react to the window instead of only to
 *  a fixed breakpoint baked into a class name. */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);

    // The window can be resized between render and effect, so read it again.
    sync();
    list.addEventListener("change", sync);
    return () => list.removeEventListener("change", sync);
  }, [query]);

  return matches;
}
