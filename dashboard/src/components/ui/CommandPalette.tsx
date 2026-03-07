// dashboard/src/components/ui/CommandPalette.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, FileText, Key, Download, Users, BarChart3, Shield, Settings, AlertCircle } from "lucide-react";

const pages = [
  { label: "Overview", path: "/overview", icon: BarChart3 },
  { label: "Audit Log", path: "/audit", icon: FileText },
  { label: "Human Review Queue", path: "/hitl", icon: AlertCircle },
  { label: "Model Inventory", path: "/models", icon: Settings },
  { label: "Compliance", path: "/compliance", icon: Shield },
  { label: "Settings", path: "/settings", icon: Settings },
];

const actions = [
  { label: "Create API Key", path: "/settings?tab=api-keys", icon: Key },
  { label: "Export Report", path: "/compliance", icon: Download },
  { label: "Invite Member", path: "/settings?tab=team", icon: Users },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((o) => !o);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const go = (path: string) => { navigate(path); setOpen(false); setQuery(""); };

  const q = query.toLowerCase();
  const filteredPages = pages.filter((p) => p.label.toLowerCase().includes(q));
  const filteredActions = actions.filter((a) => a.label.toLowerCase().includes(q));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search audits, requests, models..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-[320px] overflow-y-auto p-1">
          {filteredPages.length > 0 && (
            <div className="px-2 py-1.5">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Pages</p>
              {filteredPages.map((p) => {
                const Icon = p.icon;
                return (
                  <button key={p.path} onClick={() => go(p.path)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-left">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}
          {filteredActions.length > 0 && (
            <div className="px-2 py-1.5">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Quick Actions</p>
              {filteredActions.map((a) => {
                const Icon = a.icon;
                return (
                  <button key={a.path} onClick={() => go(a.path)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-left">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {a.label}
                  </button>
                );
              })}
            </div>
          )}
          {filteredPages.length === 0 && filteredActions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No results found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
