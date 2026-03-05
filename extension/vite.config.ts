import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

export default defineConfig(() => {
  const extensionRoot = __dirname;
  const distDir = path.resolve(extensionRoot, "dist");

  return {
    plugins: [
      react(),
      {
        name: "extension-post-build",
        async closeBundle() {
          const { build } = await import("vite");

          // Build content script (IIFE)
          await build({
            configFile: false,
            envDir: path.resolve(extensionRoot, ".."),
            build: {
              outDir: distDir,
              emptyOutDir: false,
              target: "chrome110",
              lib: {
                entry: path.resolve(extensionRoot, "src/content/index.ts"),
                formats: ["iife"],
                name: "CartifyContent",
                fileName: () => "content.js",
              },
              rollupOptions: {
                output: { inlineDynamicImports: true },
              },
            },
            resolve: {
              alias: { "@ext": path.resolve(extensionRoot, "src") },
            },
          });

          // Build web app sync content script (IIFE)
          await build({
            configFile: false,
            envDir: path.resolve(extensionRoot, ".."),
            build: {
              outDir: distDir,
              emptyOutDir: false,
              target: "chrome110",
              lib: {
                entry: path.resolve(extensionRoot, "src/content/webAppSync.ts"),
                formats: ["iife"],
                name: "CartifyWebAppSync",
                fileName: () => "webAppSync.js",
              },
              rollupOptions: {
                output: { inlineDynamicImports: true },
              },
            },
            resolve: {
              alias: { "@ext": path.resolve(extensionRoot, "src") },
            },
          });

          // Build background service worker (IIFE)
          await build({
            configFile: false,
            envDir: path.resolve(extensionRoot, ".."),
            build: {
              outDir: distDir,
              emptyOutDir: false,
              target: "chrome110",
              lib: {
                entry: path.resolve(extensionRoot, "src/background/index.ts"),
                formats: ["iife"],
                name: "CartifyBackground",
                fileName: () => "background.js",
              },
              rollupOptions: {
                output: { inlineDynamicImports: true },
              },
            },
            resolve: {
              alias: { "@ext": path.resolve(extensionRoot, "src") },
            },
          });

          // Build side panel (HTML entry)
          await build({
            configFile: false,
            plugins: [react()],
            envDir: path.resolve(extensionRoot, ".."),
            root: path.resolve(extensionRoot, "src/sidepanel"),
            base: "./",
            build: {
              outDir: distDir,
              emptyOutDir: false,
              target: "chrome110",
              rollupOptions: {
                input: path.resolve(extensionRoot, "src/sidepanel/index.html"),
                output: {
                  entryFileNames: "assets/sidepanel-[hash].js",
                  chunkFileNames: "assets/[name]-[hash].js",
                  assetFileNames: "assets/[name]-[hash][extname]",
                },
              },
            },
            resolve: {
              alias: { "@ext": path.resolve(extensionRoot, "src") },
            },
          });

          // Rename sidepanel index.html
          const sidepanelIndex = path.resolve(distDir, "index.html");
          const sidepanelHtml = path.resolve(distDir, "sidepanel.html");
          if (fs.existsSync(sidepanelIndex)) {
            fs.renameSync(sidepanelIndex, sidepanelHtml);
          }

          // Copy manifest.json into dist
          fs.copyFileSync(
            path.resolve(extensionRoot, "manifest.json"),
            path.resolve(distDir, "manifest.json")
          );

          // Rename popup index.html → popup.html
          const indexHtml = path.resolve(distDir, "index.html");
          const popupHtml = path.resolve(distDir, "popup.html");
          if (fs.existsSync(indexHtml)) {
            fs.renameSync(indexHtml, popupHtml);
          }
        },
      },
    ],

    // Popup is the main entry (React app)
    root: path.resolve(extensionRoot, "src/popup"),
    base: "./",
    envDir: path.resolve(extensionRoot, ".."),

    build: {
      outDir: distDir,
      emptyOutDir: true,
      modulePreload: { polyfill: false },
      target: "chrome110",
      rollupOptions: {
        input: path.resolve(extensionRoot, "src/popup/index.html"),
        output: {
          entryFileNames: "assets/popup-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },

    resolve: {
      alias: { "@ext": path.resolve(extensionRoot, "src") },
    },
  };
});
