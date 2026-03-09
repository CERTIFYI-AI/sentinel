// src/lib/config.ts
// Centralized environment configuration with type safety

export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_URL || "/api",
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || "Certifyi Sentinel",
    version: import.meta.env.VITE_APP_VERSION || "0.4.0",
  },
  features: {
    auth: import.meta.env.VITE_ENABLE_AUTH !== "false",
    mockData: import.meta.env.VITE_ENABLE_MOCK_DATA === "true",
  },
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

export type AppConfig = typeof config;
