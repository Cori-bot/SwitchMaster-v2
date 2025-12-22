import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    outDir: "dist-main",
    emptyOutDir: true,
    target: "node18",
    lib: {
        entry: path.join(__dirname, "src/main/main.ts"),
        formats: ["cjs"],
        fileName: () => "main.js",
      },
    rollupOptions: {
      external: [
        "electron",
        "path",
        "fs",
        "url",
        "https",
        "http",
        "crypto",
        "os",
        "child_process",
        "events",
        "util",
        "fs-extra",
        "electron-log",
        "electron-updater",
      ],
    },
  },
  ssr: {
    noExternal: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
