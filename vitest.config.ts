import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // 複数テストファイルが同一 SQLite test.db を共有するため直列実行する
    fileParallelism: false,
    env: {
      DATABASE_URL: "file:./test.db",
      SESSION_SECRET: "test-secret-for-vitest-at-least-16-chars",
      NODE_ENV: "test",
    },
    include: [
      "tests/unit/**/*.spec.ts",
      "tests/unit/**/*.spec.tsx",
      "tests/component/**/*.spec.ts",
      "tests/component/**/*.spec.tsx",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    exclude: [
      "tests/e2e/**",
      "node_modules",
      ".next",
    ],
    coverage: {
      provider: "v8",
      include: ["src/server/services/**"],
      reporter: ["text", "json"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
