
import { useState } from "react";

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
const TEAMS = ["Security Team", "ML Team", "Ethics Board", "DevOps", "Release Eng", "Compliance"] as const;

interface Incident {
  id: string; title: string; severity: typeof SEVERITIES[number];
  team: string; status: string; created: string; description: string;
}

const INITIAL: Incident[] = [
  { id: "INC-001", title: "PII detected in model output", severity: "CRITICAL", team: "Security Team", status: "investigating", created: "2025-01-15 14:30", description: "Patient SSN leaked in GPT-4o response" },
  { id: "INC-002", title: "Model hallucination in legal responses", severity: "HIGH", team: "ML Team", status: "mitigated", created: "2025-01-14 09:15", description: "Claude generated false case citations" },
  { id: "INC-003", title: "Bias detected in hiring model", severity: "HIGH", team: "Ethics Board", status: "open", created: "2025-01-13 16:45", description: "Gender bias in candidate scoring" },
  { id: "INC-004", title: "Latency spike on inference endpoint", severity: "MEDIUM", team: "DevOps", status: "resolved", created: "2025-01-12 11:00", description: "P95 latency exceeded 2s threshold" },
  { id: "INC-005", title: "Model version mismatch in staging", severity: "LOW", team: "Release Eng", status: "resolved", created: "2025-01-11 08:30", description: "Wrong model deployed to staging" },
];

const sevColor: Record<string, string> = { CRITICAL: "bg-red-600 text-white", HIGH: "bg-red-500 text-white", MEDIUM: "bg-amber-500 text-white", LOW: "bg-zinc-500 text-white" };
const statusColor: Record<string, string> = { investigating: "text-red-600", open: "text-amber-600", mitigated: "text-blue-600", resolved: "text-green-600" };

export default function IncidentLog() {
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL);
  const [showForm, setShowForm] = useState(false);
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Incident Log</h1>
          <p className="text-sm text-zinc-500 mt-1">Track and manage AI safety incidents</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Report Incident</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Report New Incident</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" placeholder="Brief incident title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Severity</label>
                  <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value as any})} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm">
                    {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Assigned Team</label>
                  <select value={form.team} onChange={e => setForm({...form, team: e.target.value})} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm">
                    {TEAMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Description *</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" placeholder="Detailed description of what happened..." />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg">Cancel</button>
                <button onClick={submit} disabled={!form.title.trim() || !form.description.trim()} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">Submit Incident</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-xl">
        <div className="px-5 py-3 border-b border-zinc-100"><h3 className="text-sm font-semibold text-zinc-700">Recent Incidents</h3></div>
        <div className="divide-y divide-zinc-100">
          {incidents.map(inc => (
            <div key={inc.id} className="px-5 py-4 flex items-center justify-between hover:bg-zinc-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-400">{inc.id}</span>
                  <span className="font-medium text-sm text-zinc-900">{inc.title}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{inc.created} · {inc.team} · <span className={statusColor[inc.status] || ""}>{inc.status}</span></p>
                <p className="text-xs text-zinc-400 mt-0.5">{inc.description}</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${sevColor[inc.severity]}`}>{inc.severity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
