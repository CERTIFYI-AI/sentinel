// Self-hosted Outfit variable font — no CDN dependency (ADR-0007)
import '@fontsource-variable/outfit';
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import { ThemeProvider } from "./providers/theme";
import { Toaster } from "sonner";
import "./index.css";
import "./styles/globals.css";
import "./styles/a11y.css";
import "./store/accentStore";
import { LiveRegionProvider } from "./lib/a11y/LiveRegion";
import { getLocale } from "./i18n";
// Auto-register the 26 governance agents on app bootstrap.
// Side-effect import — each agent file calls governanceBus.registerAgent.
import "./agents";
import { setLoggerErrorSink } from "./lib/logger";

// Observability: forward logger.error to Sentry when a DSN is configured.
// sentry.ts loads @sentry/browser dynamically and no-ops without a DSN,
// so this adds no dependency and no cost when VITE_SENTRY_DSN is unset.
if (import.meta.env.VITE_SENTRY_DSN) {
  import("./lib/observability/sentry")
    .then(({ captureException }) => {
      setLoggerErrorSink((...args: unknown[]) => {
        const err =
          args.find((a) => a instanceof Error) ??
          new Error(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
        void captureException(err);
      });
    })
    .catch(() => { /* observability must never block app bootstrap */ });
}

// Set <html lang> early so screen readers pick up the right pronunciation.
document.documentElement.setAttribute("lang", getLocale());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LiveRegionProvider>
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            duration={4000}
            toastOptions={{
              style: {
                borderRadius: '0px',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
              },
            }}
          />
        </QueryClientProvider>
      </LiveRegionProvider>
    </ThemeProvider>
  </React.StrictMode>
);
