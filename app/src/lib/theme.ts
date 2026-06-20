/**
 * Theme management for the app. Light & dark are equal peers via the attribute
 * strategy: the resolved theme is always written to `data-theme` on <html>.
 * Mirrors the design system's theme contract (src/lib/theme.ts in the library).
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "fa-theme";

/** Blocking script, run in <head> before first paint to avoid a theme flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export function getResolvedTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage unavailable — honor for this session only */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getResolvedTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
