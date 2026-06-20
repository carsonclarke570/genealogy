/**
 * Theme management for Family Archive.
 *
 * Light and dark are equal peers (see DESIGN.md). Resolution order:
 *   1. An explicit user choice persisted in localStorage ("light" | "dark").
 *   2. Otherwise the OS preference (`prefers-color-scheme`), live.
 *
 * The choice is expressed as `data-theme` on <html>:
 *   - data-theme="light" | "dark"  → explicit, always wins
 *   - no attribute                 → follow the system (the CSS media query)
 */

export type Theme = "light" | "dark";
export type ThemeChoice = Theme | "system";

const STORAGE_KEY = "fa-theme";

/**
 * Blocking script, stringified, to run in <head> BEFORE first paint so the
 * correct theme is applied with no flash of the wrong colors.
 *
 * In a Next.js App Router layout:
 *   <head>
 *     <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
 *   </head>
 *
 * It only sets data-theme for an *explicit* stored choice; "system" (or no
 * stored value) is left to the `prefers-color-scheme` media query in tokens.css.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

/** The user's stored preference, or "system" if they've never chosen. */
export function getThemeChoice(): ThemeChoice {
  if (typeof localStorage === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

/** The theme actually in effect right now, resolving "system" to its value. */
export function getResolvedTheme(): Theme {
  const choice = getThemeChoice();
  if (choice !== "system") return choice;
  if (typeof matchMedia === "undefined") return "light";
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Apply and persist a theme choice. Pass "system" to clear the override and
 * fall back to the OS preference.
 */
export function setTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") {
    root.removeAttribute("data-theme");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — honor the choice for this session only */
    }
    return;
  }
  root.setAttribute("data-theme", choice);
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* storage unavailable — honor the choice for this session only */
  }
}

/** Flip between light and dark based on what's currently showing. */
export function toggleTheme(): Theme {
  const next: Theme = getResolvedTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

/**
 * Subscribe to OS theme changes while the user is on "system".
 * Returns an unsubscribe function. Useful for keeping a toggle's icon in sync.
 */
export function onSystemThemeChange(cb: (theme: Theme) => void): () => void {
  if (typeof matchMedia === "undefined") return () => {};
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    if (getThemeChoice() === "system") cb(e.matches ? "dark" : "light");
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
