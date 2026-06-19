import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2020",
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
  // Single self-contained ESM entry so the design-sync converter can bundle
  // dist/index.js into a single window global.
  splitting: false,
  outDir: "dist",
});
