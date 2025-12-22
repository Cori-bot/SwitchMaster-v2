import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  root: path.join(__dirname),
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/renderer"),
      "@assets": path.resolve(__dirname, "./src/assets"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});
