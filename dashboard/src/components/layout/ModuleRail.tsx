// dashboard/src/components/layout/ModuleRail.tsx
import { useNavigate, useLocation } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, LayoutGrid, AlertTriangle, Hexagon, HelpCircle, Settings } from "lucide-react";

const modules = [
  { id: "proxy", icon: Activity, label: "Proxy \u2014 AI Trust Engine", path: "/overview", active: true },
  { id: "evals", icon: LayoutGrid, label: "Evals \u2014 Coming in v0.3", path: "", active: false },
  { id: "risk", icon: AlertTriangle, label: "Risk \u2014 Coming in v0.3", path: "", active: false },
  { id: "shadow", icon: Hexagon, label: "Shadow \u2014 Coming in v0.3", path: "", active: false },
];

export function ModuleRail() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="hidden md:flex flex-col w-12 min-h-screen bg-sidebar border-r border-border">
        <div className="flex-1 flex flex-col items-center pt-3 gap-1">
          {modules.map((m) => {
            const Icon = m.icon;
            const isActive = m.active && location.pathname !== "/settings";
            return (
              <Tooltip key={m.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => m.active && navigate(m.path)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                      isActive
                        ? "bg-[hsl(136,45%,38%)] text-white"
                        : m.active
                        ? "text-muted-foreground hover:bg-accent"
                        : "text-muted-foreground/40 cursor-not-allowed"
                    }`}
                    aria-label={m.label}
                    disabled={!m.active}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{m.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex flex-col items-center pb-3 gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent" aria-label="Help">
                <HelpCircle className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Help</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => navigate("/settings")} className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                location.pathname === "/settings" ? "bg-[hsl(136,45%,38%)] text-white" : "text-muted-foreground hover:bg-accent"
              }`} aria-label="Settings">
                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
