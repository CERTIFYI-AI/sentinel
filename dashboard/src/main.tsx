import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ThemeProvider } from "./components/theme-provider"
import App from "./App"
import "./index.css"

// ThemeProvider wraps the entire app so the `dark` class is applied to
// <html> before the first paint. Without this wrapper the dark class is
// never set and dark mode is a no-op (F-11).
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="sentinel-theme">
      <App />
    </ThemeProvider>
  </StrictMode>,
)
