import { FileText, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { useState } from "react";

interface Policy { id: string; name: string; framework: string; version: string; updated: string; content: string; status: "active" | "draft" | "archived"; }

const TEMPLATES: Policy[] = [
  { id: "p1", name: "AI Usage Policy", framework: "EU AI Act", version: "v2.1", updated: "2025-01-15", status: "active", content: "This policy governs the use of AI systems within the organization. All deployments must pass compliance checks before production release. High-risk AI systems require human oversight and transparency documentation." },
  { id: "p2", name: "Data Retention Policy", framework: "GDPR", version: "v1.3", updated: "2025-01-10", status: "active", content: "Personal data collected through AI processing must be retained only for the minimum period necessary. Automated deletion after 90 days unless explicit consent is obtained. Data subjects must be informed of retention periods." },
  { id: "p3", name: "Model Deployment Policy", framework: "NIST AI RMF", version: "v3.0", updated: "2025-01-08", status: "active", content: "All AI models must undergo bias testing, security review, and performance benchmarking before deployment. Model cards must be generated and reviewed. Rollback procedures must be documented and tested." },
  { id: "p4", name: "Bias & Fairness Policy", framework: "IEEE 7000", version: "v1.0", updated: "2025-01-05", status: "active", content: "AI systems must be evaluated for demographic bias across protected attributes. Fairness metrics must meet minimum thresholds. Bias audits must be conducted quarterly." },
  { id: "p5", name: "AI Risk Management Policy", framework: "ISO 42001", version: "v2.0", updated: "2025-01-12", status: "active", content: "Risks associated with AI systems must be identified, assessed, and mitigated. Risk registers must be maintained. Residual risks must be accepted by designated risk owners." },
  { id: "p6", name: "Incident Response Policy", framework: "SOC 2 Type II", version: "v1.5", updated: "2025-01-07", status: "active", content: "AI-related security incidents must be reported within 1 hour. Incident severity must be classified. Root cause analysis must be completed within 48 hours." },
  { id: "p7", name: "Information Security Policy", framework: "ISO 27001", version: "v4.0", updated: "2025-01-03", status: "active", content: "AI systems must comply with information security controls. Access to model endpoints must be authenticated and authorized. Encryption in transit and at rest is mandatory." },
  { id: "p8", name: "PII Protection Policy", framework: "GDPR", version: "v2.2", updated: "2025-01-14", status: "active", content: "AI systems must detect and mask PII in inputs and outputs. PII processing must have a lawful basis. Data protection impact assessments required for high-risk processing." },
  { id: "p9", name: "Transparency & Explainability", framework: "EU AI Act", version: "v1.1", updated: "2025-01-06", status: "draft", content: "Users must be informed when interacting with AI. Model decisions must be explainable on request. Technical documentation must be maintained for high-risk systems." },
];

const fwColor: Record<string, string> = { "EU AI Act": "bg-blue-100 text-blue-700", "GDPR": "bg-purple-100 text-purple-700", "NIST AI RMF": "bg-indigo-100 text-indigo-700", "IEEE 7000": "bg-teal-100 text-teal-700", "ISO 42001": "bg-amber-100 text-amber-700", "SOC 2 Type II": "bg-orange-100 text-orange-700", "ISO 27001": "bg-cyan-100 text-cyan-700" };

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
    setPolicies(prev => prev.map(p => p.id === sel.id ? { ...p, content: editContent, updated: new Date().toISOString().slice(0, 10), version: `v${parseFloat(p.version.slice(1)) + 0.1}` } : p));
    setEditContent(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div><h1 className="text-2xl font-bold text-zinc-900">Policy Editor</h1><p className="text-sm text-zinc-500 mt-1">Create and manage governance policies</p></div>
        <button onClick={() => setShowNew(true)} className="bg-green-600 hover:bg-green-700 text-foreground px-4 py-2 rounded-none text-sm font-medium">New Policy</button>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowNew(false)}>
          <div className="bg-card rounded-none shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Create New Policy</h2>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Policy Name *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-zinc-300 rounded-none px-3 py-2 text-sm" placeholder="e.g. Data Governance Policy" /></div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Framework</label><select value={form.framework} onChange={e => setForm({...form, framework: e.target.value})} className="w-full border border-zinc-300 rounded-none px-3 py-2 text-sm">{Object.keys(fwColor).map(f => <option key={f}>{f}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-zinc-600 mb-1">Policy Content *</label><textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={5} className="w-full border border-zinc-300 rounded-none px-3 py-2 text-sm" placeholder="Write the policy content..." /></div>
              <div className="flex gap-3 justify-end"><button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-none">Cancel</button><button onClick={addPolicy} disabled={!form.name.trim() || !form.content.trim()} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-foreground rounded-none disabled:opacity-40">Create Policy</button></div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-card border border-zinc-200 rounded-none">
          <div className="px-4 py-3 border-b border-zinc-100"><h3 className="text-sm font-semibold text-zinc-700">Policies ({policies.length})</h3></div>
          <div className="divide-y divide-zinc-50 max-h-[600px] overflow-y-auto">
            {policies.map(p => (
              <button key={p.id} onClick={() => { setSelected(p.id); setEditContent(null); }} className={`w-full text-left px-4 py-3 hover:bg-zinc-50 ${selected === p.id ? "bg-green-50 border-l-2 border-green-500" : ""}`}>
                <p className="text-sm font-medium text-zinc-800">{p.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${fwColor[p.framework] || "bg-zinc-100 text-zinc-600"}`}>{p.framework}</span>
                  <span className="text-[10px] text-zinc-400">{p.version} · {p.updated}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 bg-white border border-zinc-200 rounded-none">
          {sel ? (
            <div>
              <div className="px-5 py-4 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">{sel.name}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{sel.version} by Compliance Team · {sel.updated}</p>
                </div>
                <div className="flex gap-2">
                  {editContent !== null ? (
                    <><button onClick={() => setEditContent(null)} className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded">Cancel</button><button onClick={saveEdit} className="px-3 py-1.5 text-xs bg-green-600 text-foreground rounded">Save</button></>
                  ) : (
                    <button onClick={() => setEditContent(sel.content)} className="px-3 py-1.5 text-xs border border-zinc-300 rounded hover:bg-zinc-50">Edit</button>
                  )}
                </div>
              </div>
              <div className="p-5">
                {editContent !== null ? (
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={12} className="w-full border border-zinc-300 rounded-none px-4 py-3 text-sm font-mono" />
                ) : (
                  <div className="bg-zinc-50 rounded-none p-4 text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap font-mono">{sel.content}</div>
                )}
              </div>
            </div>
          ) : <div className="p-10 text-center text-zinc-400">Select a policy to view</div>}
        </div>
      </div>
    </div>
  );
}
