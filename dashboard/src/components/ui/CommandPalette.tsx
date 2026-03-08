import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  type: "page" | "eval" | "control" | "evidence" | "risk" | "vendor" | "task" | "action";
  title: string;
  subtitle?: string;
  path?: string;
  action?: () => void;
}

const PAGES: SearchResult[] = [
  { type: "page", title: "Dashboard", subtitle: "Overview", path: "/overview" },
  { type: "page", title: "Audit Log", subtitle: "Trust & Safety", path: "/audit-log" },
  { type: "page", title: "HITL Queue", subtitle: "Trust & Safety", path: "/hitl-queue" },
  { type: "page", title: "Incident Log", subtitle: "Trust & Safety", path: "/incidents" },
  { type: "page", title: "Compliance", subtitle: "Compliance", path: "/compliance" },
  { type: "page", title: "Control Requirements", subtitle: "Compliance", path: "/compliance/controls" },
  { type: "page", title: "Evidence Hub", subtitle: "Compliance", path: "/compliance/evidence" },
  { type: "page", title: "Policy Editor", subtitle: "Compliance", path: "/policies" },
  { type: "page", title: "Model Inventory", subtitle: "Risk & Models", path: "/models" },
  { type: "page", title: "Risk Matrix", subtitle: "Risk & Models", path: "/risk-matrix" },
  { type: "page", title: "Risk Register", subtitle: "Risk & Models", path: "/risk/register" },
  { type: "page", title: "Vendor Register", subtitle: "Risk & Models", path: "/risk/vendors" },
  { type: "page", title: "Benchmark", subtitle: "Evaluation", path: "/benchmark" },
  { type: "page", title: "Experiments", subtitle: "Evaluation", path: "/evals/experiments" },
  { type: "page", title: "Dataset Hub", subtitle: "Evaluation", path: "/evals/datasets" },
  { type: "page", title: "Metric Studio", subtitle: "Evaluation", path: "/evals/metrics" },
  { type: "page", title: "Tasks", subtitle: "Operations", path: "/tasks" },
  { type: "page", title: "Dependency Graph", subtitle: "Infrastructure", path: "/graph" },
  { type: "page", title: "Activity Log", subtitle: "Infrastructure", path: "/activity" },
  { type: "page", title: "Remediation", subtitle: "Operations", path: "/remediation" },
  { type: "page", title: "Export Center", subtitle: "Operations", path: "/exports" },
  { type: "page", title: "Settings", subtitle: "System", path: "/settings" },
];

const ACTIONS: SearchResult[] = [
  { type: "action", title: "Run evaluation", subtitle: "Start a new eval run", path: "/evals/experiments/new" },
  { type: "action", title: "Upload evidence", subtitle: "Add compliance evidence", path: "/compliance/evidence" },
  { type: "action", title: "Register risk", subtitle: "Add to risk register", path: "/risk/register" },
  { type: "action", title: "Register vendor", subtitle: "Add vendor record", path: "/risk/vendors" },
  { type: "action", title: "Create task", subtitle: "New compliance task", path: "/tasks" },
  { type: "action", title: "Generate compliance report", subtitle: "Gap analysis", path: "/compliance" },
  { type: "action", title: "Export audit log", subtitle: "Last 30 days", path: "/activity" },
  { type: "action", title: "Open dependency graph", subtitle: "Visualise relationships", path: "/graph" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(o => !o); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const results = useMemo(() => {
    if (!query.trim()) return [...PAGES.slice(0, 5), ...ACTIONS.slice(0, 3)];
    const q = query.toLowerCase();
    return [...PAGES, ...ACTIONS].filter(r => r.title.toLowerCase().includes(q) || (r.subtitle?.toLowerCase().includes(q)));
  }, [query]);
  if (!open) return null;
  const typeIcons: Record<string, string> = { page: "P", eval: "E", control: "C", evidence: "Ev", risk: "R", vendor: "V", task: "T", action: "A" };
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/50" onClick={() => { setOpen(false); setQuery(""); }} />
      <div className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center border-b border-[hsl(var(--border))] px-4">
          <svg className="w-4 h-4 mr-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input className="flex-1 py-3 text-sm bg-transparent outline-none" placeholder="Search pages, actions, controls..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">ESC</kbd>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {results.length === 0 && <div className="text-sm text-center py-6 text-[hsl(var(--muted-foreground))]">No results found</div>}
          {results.map((r, i) => (
            <button key={i} onClick={() => { if (r.path) navigate(r.path); if (r.action) r.action(); setOpen(false); setQuery(""); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[hsl(var(--surface-2))] text-left">
              <span className="w-6 h-6 rounded bg-[hsl(var(--surface-3))] flex items-center justify-center text-[10px] font-bold shrink-0">{typeIcons[r.type] || "?"}</span>
              <div className="min-w-0"><div className="text-sm font-medium truncate">{r.title}</div>{r.subtitle && <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">{r.subtitle}</div>}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
