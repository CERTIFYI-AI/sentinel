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
// Auto-register all 27 governance agents on app bootstrap.
// Side-effect import — each agent file calls governanceBus.registerAgent.
import "./agents";

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
                fontFamily: 'Outfit, sans-serif',
                fontSize: '13px',
              },
            }}
          />
        </QueryClientProvider>
      </LiveRegionProvider>
    </ThemeProvider>
  </React.StrictMode>
);
