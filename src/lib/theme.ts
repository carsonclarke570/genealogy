/**
 * Theme management for Family Archive.
 *
 * Light and dark are equal peers (see DESIGN.md). Attribute strategy: the
 * resolved theme is ALWAYS written to `data-theme` on <html> — there is no
 * prefers-color-scheme block in the CSS. Resolution order:
 *   1. An explicit user choice persisted in localStorage ("light" | "dark").
 *   2. Otherwise the OS preference (`prefers-color-scheme`), resolved to a value.
 *
 * So `data-theme` always reads "light" or "dark"; "system" is a stored *choice*
 * (no key), not an attribute value. Keeping a single explicit theme scope makes
 * the cascade unambiguous and keeps the synced design-system CSS analyzable.
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
 * It always sets data-theme to the resolved value: the stored choice if present,
 * otherwise the OS preference. (No media-query fallback in the CSS.)
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — honor the choice for this session only */
    }
    // Attribute strategy: still write the resolved value (no media-query fallback).
    root.setAttribute("data-theme", getResolvedTheme());
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
 * Keep the theme in sync with the OS while the user is on "system". Because the
 * attribute strategy has no media-query fallback, this re-applies `data-theme`
 * on OS changes (and calls `cb`, e.g. to refresh a toggle icon). Returns an
 * unsubscribe function. Mount this once at the app root.
 */
export function onSystemThemeChange(cb?: (theme: Theme) => void): () => void {
  if (typeof matchMedia === "undefined") return () => {};
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    if (getThemeChoice() !== "system") return;
    const theme: Theme = e.matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    cb?.(theme);
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
