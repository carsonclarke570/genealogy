import type { Preview } from "@storybook/react";
// Tailwind + design tokens. Storybook compiles this via PostCSS so every story
// renders with the real, fully-styled design system.
import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: {
      default: "canvas",
      values: [
        { name: "canvas", value: "#f6f1e7" },
        { name: "surface", value: "#fffdf8" },
        { name: "white", value: "#ffffff" },
      ],
    },
  },
};

export default preview;
