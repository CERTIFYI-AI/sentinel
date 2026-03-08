import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from "./components/theme-provider"
import App from "./App"
import "./index.css"

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

// ThemeProvider wraps the entire app so the `dark` class is applied to
// <html> before the first paint. Without this wrapper the dark class is
// never set and dark mode is a no-op (F-11).
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="sentinel-theme">
      <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
