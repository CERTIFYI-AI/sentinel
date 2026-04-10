import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import { ThemeProvider } from "./providers/ThemeProvider";
import "./index.css";
import "./styles/globals.css";
import "./store/accentStore";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
      </ThemeProvider>
  </React.StrictMode>
);
