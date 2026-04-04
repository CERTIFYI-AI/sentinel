// dashboard/src/components/layout/TopBar.tsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, MagnifyingGlass, Sun, Moon, CaretRight, User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { NotificationDrawer } from "@/components/ui/NotificationDrawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const pathNames: Record<string, string> = {
  "/overview": "Overview",
  "/audit": "Audit Log",
  "/hitl": "Human Review Queue",
  "/models": "Model Inventory",
  "/compliance": "Compliance",
  "/compliance/evidence": "Evidence",
  "/settings": "Settings",
};

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const currentPage = pathNames[location.pathname] || "Overview";

  return (
    <>
      <header className="h-12 border-b border-border bg-background flex items-center px-4 gap-3 shrink-0">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm">
          <button onClick={() => navigate("/overview")} className="text-muted-foreground hover:text-foreground transition-colors">Proxy</button>
          <CaretRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">{currentPage}</span>
        </nav>

        {/* MagnifyingGlass */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-auto bg-muted/50 rounded-none px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <MagnifyingGlass className="h-3.5 w-3.5" />
          <span>MagnifyingGlass audits, requests, models...</span>
          <kbd className="ml-auto text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">&#8984;K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          {/* HITL badge */}
          <Button variant="ghost" size="sm" onClick={() => navigate("/hitl")} className="relative h-8 px-2">
            <span className="text-xs">HITL</span>
            <span className="absolute -top-1 -right-1 bg-red-500 text-foreground text-[10px] rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">3</span>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-8 w-8 relative" onClick={() => setNotifOpen(true)} aria-label="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>

          {/* Live indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2">
            <span className="h-2 w-2 rounded-full bg-[hsl(136,45%,38%)] animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-full bg-[hsl(136,45%,38%)] text-foreground flex items-center justify-center text-xs font-medium">
                AK
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate("/settings")}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings?tab=api-keys")}>API Keys</DropdownMenuItem>
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <NotificationDrawer open={notifOpen} onOpenChange={setNotifOpen} />
    </>
  );
}
