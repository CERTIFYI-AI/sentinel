import { useState } from "react";
import { AlertTriangle, Plus, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
const TEAMS = ["Security Team", "ML Team", "Ethics Board", "DevOps", "Release Eng", "Compliance"] as const;

interface Incident {
  id: string; title: string; severity: typeof SEVERITIES[number];
  team: string; status: string; created: string; description: string;
}

const INITIAL: Incident[] = [
  { id: "INC-001", title: "PII detected in model output", severity: "CRITICAL", team: "Security Team", status: "investigating", created: "2025-01-15 14:30", description: "Patient SSN leaked in GPT-4o response during customer support interaction" },
  { id: "INC-002", title: "Model hallucination in legal responses", severity: "HIGH", team: "ML Team", status: "mitigated", created: "2025-01-14 09:15", description: "Claude generated false case citations in contract analysis workflow" },
  { id: "INC-003", title: "Bias detected in hiring model", severity: "HIGH", team: "Ethics Board", status: "open", created: "2025-01-13 16:45", description: "Gender bias in candidate scoring — female candidates scored 12% lower on average" },
  { id: "INC-004", title: "Latency spike on inference endpoint", severity: "MEDIUM", team: "DevOps", status: "resolved", created: "2025-01-12 11:00", description: "P95 latency exceeded 2s threshold due to connection pool exhaustion" },
  { id: "INC-005", title: "Model version mismatch in staging", severity: "LOW", team: "Release Eng", status: "resolved", created: "2025-01-11 08:30", description: "Wrong model version deployed to staging — caught during pre-production testing" },
  { id: "INC-006", title: "Adversarial prompt bypass detected", severity: "HIGH", team: "Security Team", status: "investigating", created: "2025-01-15 16:00", description: "Jailbreak prompt successfully bypassed safety filters in production" },
];

const sevColor: Record<string, string> = {
  CRITICAL: "bg-[hsl(var(--s-er-tx))] text-[hsl(var(--bg-surface))]",
  HIGH: "bg-[hsl(var(--s-er-tx))] text-[hsl(var(--bg-surface))]",
  MEDIUM: "bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--bg-surface))]",
  LOW: "bg-[hsl(var(--text-4))] text-[hsl(var(--bg-surface))]",
};

const statusConfig: Record<string, { color: string; dot: string }> = {
  investigating: { color: "text-[hsl(var(--s-er-tx))]", dot: "bg-[hsl(var(--s-er-tx))] animate-pulse" },
  open: { color: "text-[hsl(var(--s-wn-tx))]", dot: "bg-[hsl(var(--s-wn-tx))]" },
  mitigated: { color: "text-[hsl(var(--s-in-tx))]", dot: "bg-[hsl(var(--s-in-tx))]" },
  resolved: { color: "text-[hsl(var(--s-ok-tx))]", dot: "bg-[hsl(var(--s-ok-tx))]" },
};

export default function IncidentLog() {
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [form, setForm] = useState({ title: "", severity: "HIGH" as typeof SEVERITIES[number], team: "Security Team", description: "" });

  const submit = () => {
    if (!form.title.trim() || !form.description.trim()) return;
    const inc: Incident = {
      id: `INC-${String(incidents.length + 1).padStart(3, "0")}`,
      ...form, status: "open", created: new Date().toISOString().slice(0, 16).replace("T", " "),
    };
    setIncidents([inc, ...incidents]);
    setForm({ title: "", severity: "HIGH", team: "Security Team", description: "" });
    setShowForm(false);
  };

  const filtered = incidents.filter(inc => {
    if (search && !inc.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (sevFilter !== "all" && inc.severity !== sevFilter) return false;
    return true;
  });

  const stats = {
    total: incidents.length,
    active: incidents.filter(i => i.status === "investigating" || i.status === "open").length,
    critical: incidents.filter(i => i.severity === "CRITICAL" && i.status !== "resolved").length,
    resolved: incidents.filter(i => i.status === "resolved").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[hsl(var(--s-er-bg))] rounded-lg"><AlertTriangle size={20} className="text-[hsl(var(--s-er-tx))]" /></div>
          <div>
            <h1 className="text-xl font-bold text-[hsl(var(--text-1))]">Incident Log</h1>
            <p className="text-sm text-[hsl(var(--text-3))]">Track and manage AI safety incidents — {stats.active} active, {stats.critical} critical</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[hsl(var(--s-ok-tx))] hover:bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={14} /> Report Incident
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Incidents", value: stats.total },
          { label: "Active", value: stats.active, color: "text-[hsl(var(--s-wn-tx))]" },
          { label: "Critical Open", value: stats.critical, color: "text-[hsl(var(--s-er-tx))]" },
          { label: "Resolved", value: stats.resolved, color: "text-[hsl(var(--s-ok-tx))]" },
        ].map((s, i) => (
          <Card key={i} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-3))] font-medium">{s.label}</p>
              <p className={`text-2xl font-bold font-mono mt-1 ${s.color || "text-[hsl(var(--text-1))]"}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search incidents..." className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:ring-2 focus:ring-green-500 focus:border-[hsl(var(--s-ok-br))] outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[hsl(var(--text-4))]" />
          {["all", ...SEVERITIES].map(f => (
            <button key={f} onClick={() => setSevFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              sevFilter === f ? "bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))]" : "bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] text-[hsl(var(--text-2))]"
            }`}>{f === "all" ? "All" : f}</button>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-[hsl(var(--bg-surface))] rounded-xl shadow-xl p-6 w-full max-w-lg border border-[hsl(var(--border))]" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[hsl(var(--text-1))] mb-4">Report New Incident</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:ring-2 focus:ring-green-500 focus:border-[hsl(var(--s-ok-br))] outline-none" placeholder="Brief incident title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Severity</label>
                  <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value as any})} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))]">
                    {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Assigned Team</label>
                  <select value={form.team} onChange={e => setForm({...form, team: e.target.value})} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))]">
                    {TEAMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Description *</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:ring-2 focus:ring-green-500 focus:border-[hsl(var(--s-ok-br))] outline-none" placeholder="Detailed description of what happened..." />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-muted))] rounded-lg transition-colors">Cancel</button>
                <button onClick={submit} disabled={!form.title.trim() || !form.description.trim()} className="px-4 py-2 text-sm bg-[hsl(var(--s-ok-tx))] hover:bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Submit Incident</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incident List */}
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardContent className="p-0">
          <div className="divide-y divide-[hsl(var(--border))]">
            {filtered.map(inc => {
              const sc = statusConfig[inc.status] || statusConfig.open;
              return (
                <div key={inc.id} className="px-5 py-4 flex items-center justify-between hover:bg-[hsl(var(--bg-raised))] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-[hsl(var(--text-4))]">{inc.id}</span>
                      <span className="font-medium text-sm text-[hsl(var(--text-1))]">{inc.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[hsl(var(--text-3))]">
                      <span>{inc.created}</span>
                      <span>{inc.team}</span>
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        <span className={`font-medium capitalize ${sc.color}`}>{inc.status}</span>
                      </span>
                    </div>
                    <p className="text-xs text-[hsl(var(--text-4))] mt-0.5 line-clamp-1">{inc.description}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ml-4 ${sevColor[inc.severity]}`}>{inc.severity}</span>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-[hsl(var(--text-4))]">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No incidents match your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
