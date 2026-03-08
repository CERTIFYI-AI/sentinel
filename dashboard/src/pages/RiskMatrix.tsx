import { useState } from "react";

interface Risk {
  id: string;
  name: string;
  likelihood: number;
  impact: number;
  category: string;
  owner: string;
  status: "open" | "mitigated" | "accepted";
}

const INITIAL_RISKS: Risk[] = [
  { id: "RSK-001", name: "Biased hiring recommendations", likelihood: 4, impact: 5, category: "Fairness", owner: "ML Team", status: "open" },
  { id: "RSK-002", name: "PII leakage in model outputs", likelihood: 3, impact: 5, category: "Privacy", owner: "Security", status: "open" },
  { id: "RSK-003", name: "Model hallucination in legal docs", likelihood: 4, impact: 4, category: "Accuracy", owner: "Legal", status: "mitigated" },
  { id: "RSK-004", name: "Adversarial prompt injection", likelihood: 3, impact: 4, category: "Security", owner: "Security", status: "open" },
  { id: "RSK-005", name: "Regulatory non-compliance EU AI Act", likelihood: 2, impact: 5, category: "Compliance", owner: "Compliance", status: "mitigated" },
  { id: "RSK-006", name: "Training data poisoning", likelihood: 2, impact: 4, category: "Security", owner: "Data Team", status: "accepted" },
  { id: "RSK-007", name: "Unfair credit scoring", likelihood: 3, impact: 5, category: "Fairness", owner: "ML Team", status: "open" },
  { id: "RSK-008", name: "Excessive data retention", likelihood: 4, impact: 3, category: "Privacy", owner: "Data Team", status: "mitigated" },
];

const COLORS = [
  ["bg-green-100", "bg-green-200", "bg-yellow-100", "bg-yellow-200", "bg-orange-100"],
  ["bg-green-200", "bg-yellow-100", "bg-yellow-200", "bg-orange-100", "bg-orange-200"],
  ["bg-yellow-100", "bg-yellow-200", "bg-orange-100", "bg-orange-200", "bg-red-100"],
  ["bg-yellow-200", "bg-orange-100", "bg-orange-200", "bg-red-100", "bg-red-200"],
  ["bg-orange-100", "bg-orange-200", "bg-red-100", "bg-red-200", "bg-red-300"],
];

export default function RiskMatrix() {
  const [risks, setRisks] = useState<Risk[]>(INITIAL_RISKS);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", likelihood: 3, impact: 3, category: "Fairness", owner: "", status: "open" as const });

  const addRisk = () => {
    const newRisk: Risk = { ...form, id: `RSK-${String(risks.length + 1).padStart(3, "0")}`, status: form.status as Risk["status"] };
    setRisks([...risks, newRisk]);
    setShowModal(false);
    setForm({ name: "", likelihood: 3, impact: 3, category: "Fairness", owner: "", status: "open" });
  };

  const grid: Record<string, Risk[]> = {};
  risks.forEach(r => {
    const key = `${r.likelihood}-${r.impact}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(r);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Risk Matrix</h1>
          <p className="text-gray-500 dark:text-gray-400">AI risk assessment and heat map</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Add New Risk</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Risk Heat Map</h3>
            <div className="flex">
              <div className="flex flex-col justify-between pr-2 text-xs text-gray-500 py-1">
                {[5,4,3,2,1].map(n => <div key={n} className="h-16 flex items-center">{n}</div>)}
              </div>
              <div className="flex-1">
                {[5,4,3,2,1].map(row => (
                  <div key={row} className="flex">
                    {[1,2,3,4,5].map(col => {
                      const cellRisks = grid[`${row}-${col}`] || [];
                      return (
                        <div key={col} className={`flex-1 h-16 border border-white/50 ${COLORS[row-1][col-1]} flex items-center justify-center relative group`}>
                          {cellRisks.length > 0 && (
                            <span className="bg-gray-900 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">{cellRisks.length}</span>
                          )}
                          {cellRisks.length > 0 && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded p-2 whitespace-nowrap">
                              {cellRisks.map(r => <div key={r.id}>{r.id}: {r.name}</div>)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="flex mt-1">
                  {[1,2,3,4,5].map(n => <div key={n} className="flex-1 text-center text-xs text-gray-500">{n}</div>)}
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Likelihood →</span>
              <span>↑ Impact</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total Risks</span><span className="font-bold text-gray-900 dark:text-white">{risks.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Critical (L*I ≥ 20)</span><span className="font-bold text-red-600">{risks.filter(r => r.likelihood * r.impact >= 20).length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">High (L*I ≥ 12)</span><span className="font-bold text-orange-600">{risks.filter(r => r.likelihood * r.impact >= 12 && r.likelihood * r.impact < 20).length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Open</span><span className="font-bold">{risks.filter(r => r.status === "open").length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Mitigated</span><span className="font-bold text-green-600">{risks.filter(r => r.status === "mitigated").length}</span></div>
            </div>
          </div>
          <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Risk Register</h3>
            <div className="space-y-2">
              {risks.map(r => (
                <div key={r.id} className="text-xs border-b pb-2 dark:border-gray-700">
                  <div className="flex justify-between"><span className="font-mono text-gray-500">{r.id}</span><span className={`px-1.5 py-0.5 rounded ${r.status === "open" ? "bg-red-100 text-red-800" : r.status === "mitigated" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{r.status}</span></div>
                  <p className="text-gray-900 dark:text-white">{r.name}</p>
                  <p className="text-gray-400">L:{r.likelihood} I:{r.impact} Score:{r.likelihood * r.impact}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Add New Risk</h3>
            <div className="space-y-3">
              <input placeholder="Risk name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-500">Likelihood (1-5)</label>
                  <input type="number" min={1} max={5} value={form.likelihood} onChange={e => setForm({...form, likelihood: Number(e.target.value)})} className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Impact (1-5)</label>
                  <input type="number" min={1} max={5} value={form.impact} onChange={e => setForm({...form, impact: Number(e.target.value)})} className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                </div>
              </div>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                {["Fairness","Privacy","Security","Accuracy","Compliance","Transparency"].map(c => <option key={c}>{c}</option>)}
              </select>
              <input placeholder="Owner" value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              <div className="flex gap-2 pt-2">
                <button onClick={addRisk} className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700">Add Risk</button>
                <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 dark:border-gray-600 py-2 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
