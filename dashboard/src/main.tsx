import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import { ThemeProvider } from "./providers/theme";
import { Toaster } from "sonner";
import "./index.css";
import "./styles/globals.css";
import "./store/accentStore";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
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
    </ThemeProvider>
  </React.StrictMode>
);
