// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS0.5 — Vitest configuration. Uses jsdom env for component tests,
// v8 coverage with a 70% floor on lines/branches/functions/statements,
// and excludes generated/third-party code from both tests and coverage.

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules",
      "dist",
      "e2e/**",
      "tests-e2e/**",
      "**/*.e2e.*",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/rbac/**/*.{ts,tsx}",
        "src/lib/result/**/*.{ts,tsx}",
        "src/lib/tenancy/**/*.{ts,tsx}",
        "src/lib/frameworks.ts",
        "src/lib/remediationRowStyle.ts",
        "src/lib/exportUtils.ts",
        "src/i18n/index.ts",
        "src/lib/observability/rateLimit.ts",
        "src/lib/observability/otel.ts",
      ],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.stories.{ts,tsx}",
        "src/test/**",
        "src/**/__tests__/**",
        "src/**/*.test.{ts,tsx}",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },
  },
});
