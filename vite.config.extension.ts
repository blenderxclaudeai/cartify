import { defineConfig } from "vite";
import path from "path";

// Builds content.ts and background.ts as IIFE bundles for the Chrome extension.
// Run twice (once per entry) since IIFE format doesn't support multiple entry points.
// Usage: called by the build:extension npm script

export const contentConfig = defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "dist",
    lib: {
      entry: path.resolve(__dirname, "src/extension/content.ts"),
      name: "VTOContent",
      fileName: () => "content.js",
      formats: ["iife"],
    },
  },
});

export const backgroundConfig = defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "dist",
    lib: {
      entry: path.resolve(__dirname, "src/extension/background.ts"),
      name: "VTOBackground",
      fileName: () => "background.js",
      formats: ["iife"],
    },
  },
});

// Default export builds the content script
export default contentConfig;
