import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "clover", "json"],
      include: [
        "src/main/**/*.ts",
        "src/renderer/**/*.{ts,tsx}",
        "src/shared/**/*.ts",
      ],
      exclude: [
        "src/**/__tests__/**",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/main/index.ts",
        "src/main/preload.ts",
        "src/renderer/App.tsx",
        "src/renderer/main.tsx",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/renderer"),
      "@assets": path.resolve(__dirname, "./src/assets"),
    },
  },
});
