import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/renderer"),
      "@assets": path.resolve(__dirname, "./src/assets"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
