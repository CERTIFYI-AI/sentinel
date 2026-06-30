import { useState } from "react";
import { FileText, Plus, Edit3, Save, X, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface Policy { id: string; name: string; framework: string; version: string; updated: string; content: string; status: "active" | "draft" | "archived"; }

const TEMPLATES: Policy[] = [
  { id: "p1", name: "AI Usage Policy", framework: "EU AI Act", version: "v2.1", updated: "2025-01-15", status: "active", content: "This policy governs the use of AI systems within the organization. All deployments must pass compliance checks before production release. High-risk AI systems require human oversight and transparency documentation.\n\nScope: All AI/ML models deployed in production or customer-facing environments.\n\nRequirements:\n1. All models must be registered in the Model Inventory before deployment\n2. High-risk models require Ethics Board approval\n3. Trust score monitoring must be active for all production models\n4. HITL review is mandatory when trust score drops below 0.85" },
  { id: "p2", name: "Data Retention Policy", framework: "GDPR", version: "v1.3", updated: "2025-01-10", status: "active", content: "Personal data collected through AI processing must be retained only for the minimum period necessary. Automated deletion after 90 days unless explicit consent is obtained. Data subjects must be informed of retention periods.\n\nRetention Periods:\n- Model training data: 365 days (with consent)\n- Inference logs: 90 days\n- PII-containing outputs: 30 days (anonymized after 7 days)\n- Audit trail: 7 years (regulatory requirement)" },
  { id: "p3", name: "Model Deployment Policy", framework: "NIST AI RMF", version: "v3.0", updated: "2025-01-08", status: "active", content: "All AI models must undergo bias testing, security review, and performance benchmarking before deployment. Model cards must be generated and reviewed. Rollback procedures must be documented and tested.\n\nPre-deployment Checklist:\n1. Benchmark suite passed (accuracy, fairness, safety)\n2. Red-team testing completed\n3. Model card reviewed by stakeholders\n4. Rollback procedure documented and tested\n5. Monitoring dashboards configured" },
  { id: "p4", name: "Bias & Fairness Policy", framework: "IEEE 7000", version: "v1.0", updated: "2025-01-05", status: "active", content: "AI systems must be evaluated for demographic bias across protected attributes. Fairness metrics must meet minimum thresholds. Bias audits must be conducted quarterly." },
  { id: "p5", name: "AI Risk Management Policy", framework: "ISO 42001", version: "v2.0", updated: "2025-01-12", status: "active", content: "Risks associated with AI systems must be identified, assessed, and mitigated. Risk registers must be maintained. Residual risks must be accepted by designated risk owners." },
  { id: "p6", name: "Incident Response Policy", framework: "SOC 2 Type II", version: "v1.5", updated: "2025-01-07", status: "active", content: "AI-related security incidents must be reported within 1 hour. Incident severity must be classified. Root cause analysis must be completed within 48 hours." },
  { id: "p7", name: "Information Security Policy", framework: "ISO 27001", version: "v4.0", updated: "2025-01-03", status: "active", content: "AI systems must comply with information security controls. Access to model endpoints must be authenticated and authorized. Encryption in transit and at rest is mandatory." },
  { id: "p8", name: "PII Protection Policy", framework: "GDPR", version: "v2.2", updated: "2025-01-14", status: "active", content: "AI systems must detect and mask PII in inputs and outputs. PII processing must have a lawful basis. Data protection impact assessments required for high-risk processing." },
  { id: "p9", name: "Transparency & Explainability", framework: "EU AI Act", version: "v1.1", updated: "2025-01-06", status: "draft", content: "Users must be informed when interacting with AI. Model decisions must be explainable on request. Technical documentation must be maintained for high-risk systems." },
];

const fwColor: Record<string, string> = {
  "EU AI Act": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  "GDPR": "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  "NIST AI RMF": "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
  "IEEE 7000": "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
  "ISO 42001": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  "SOC 2 Type II": "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  "ISO 27001": "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400",
};

const statusBadge: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  archived: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export default function PolicyEditor() {
  const [policies, setPolicies] = useState(TEMPLATES);
  const [selected, setSelected] = useState<string | null>("p1");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", framework: "EU AI Act", content: "" });
  const [editContent, setEditContent] = useState<string | null>(null);

  const sel = policies.find(p => p.id === selected);

  const addPolicy = () => {
    if (!form.name.trim() || !form.content.trim()) return;
    const p: Policy = { id: `p${Date.now()}`, name: form.name, framework: form.framework, version: "v1.0", updated: new Date().toISOString().slice(0, 10), content: form.content, status: "draft" };
    setPolicies([p, ...policies]);
    setSelected(p.id);
    setForm({ name: "", framework: "EU AI Act", content: "" });
    setShowNew(false);
  };

  const saveEdit = () => {
    if (!editContent || !sel) return;
    setPolicies(prev => prev.map(p => p.id === sel.id ? { ...p, content: editContent, updated: new Date().toISOString().slice(0, 10), version: `v${(parseFloat(p.version.slice(1)) + 0.1).toFixed(1)}` } : p));
    setEditContent(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg"><FileText size={20} className="text-blue-600 dark:text-blue-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Policy Editor</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Create and manage governance policies across all compliance frameworks</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={14} /> New Policy
        </button>
      </div>

      {/* New Policy Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowNew(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create New Policy</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Policy Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" placeholder="e.g. Data Governance Policy" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Framework</label>
                <select value={form.framework} onChange={e => setForm({...form, framework: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  {Object.keys(fwColor).map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Policy Content *</label>
                <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={5} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" placeholder="Write the policy content..." />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                <button onClick={addPolicy} disabled={!form.name.trim() || !form.content.trim()} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-40 transition-colors">Create Policy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy List */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Policies ({policies.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {policies.map(p => (
                <button key={p.id} onClick={() => { setSelected(p.id); setEditContent(null); }} className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                  selected === p.id ? "bg-green-50 dark:bg-green-950/30 border-l-2 border-l-green-500" : ""
                }`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded capitalize flex-shrink-0 ml-2 ${statusBadge[p.status]}`}>{p.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${fwColor[p.framework] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>{p.framework}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{p.version} · {p.updated}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Policy Content */}
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            {sel ? (
              <>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-white">{sel.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${fwColor[sel.framework] || ""}`}>{sel.framework}</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1"><Clock size={10} /> {sel.version} · Updated {sel.updated}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {editContent !== null ? (
                        <>
                          <button onClick={() => setEditContent(null)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={12} /> Cancel</button>
                          <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"><Save size={12} /> Save</button>
                        </>
                      ) : (
                        <button onClick={() => setEditContent(sel.content)} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"><Edit3 size={12} /> Edit</button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editContent !== null ? (
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={16} className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm font-mono bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">{sel.content}</div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="p-10 text-center text-slate-400 dark:text-slate-500">
                <FileText size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a policy to view</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
