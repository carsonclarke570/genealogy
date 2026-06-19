import type { Config } from "tailwindcss";

/**
 * Design tokens are defined as CSS custom properties in src/styles/tokens.css
 * and surfaced here as semantic Tailwind utilities. Components are authored
 * exclusively against these semantic names (e.g. `bg-surface`, `text-ink`,
 * `text-ink-muted`, `border-line`) — never raw palette values — so the whole
 * archive can be re-themed by editing tokens.css alone.
 */
const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./.storybook/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        canvas: "var(--color-canvas)",
        surface: "var(--color-surface)",
        "surface-sunken": "var(--color-surface-sunken)",
        // Text
        ink: "var(--color-ink)",
        "ink-muted": "var(--color-ink-muted)",
        "ink-subtle": "var(--color-ink-subtle)",
        "ink-on-primary": "var(--color-ink-on-primary)",
        // Lines
        line: "var(--color-line)",
        "line-strong": "var(--color-line-strong)",
        // Brand / heritage green
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        "primary-soft": "var(--color-primary-soft)",
        // Accent / archival burgundy (certificates, emphasis)
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        // Status
        success: "var(--color-success)",
        "success-soft": "var(--color-success-soft)",
        warning: "var(--color-warning)",
        "warning-soft": "var(--color-warning-soft)",
        danger: "var(--color-danger)",
        "danger-soft": "var(--color-danger-soft)",
      },
      fontFamily: {
        serif: "var(--font-serif)",
        sans: "var(--font-sans)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      ringColor: {
        focus: "var(--color-focus-ring)",
      },
    },
  },
  plugins: [],
};

export default config;
