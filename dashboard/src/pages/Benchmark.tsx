import { useState } from "react";

interface BenchmarkResult {
  id: string;
  name: string;
  model: string;
  score: number;
  metrics: { accuracy: number; fairness: number; robustness: number; transparency: number; safety: number };
  date: string;
  status: "completed" | "running" | "failed";
}

const RESULTS: BenchmarkResult[] = [
  { id: "BM-001", name: "EU AI Act Compliance", model: "GPT-4o", score: 87, metrics: { accuracy: 92, fairness: 85, robustness: 78, transparency: 90, safety: 88 }, date: "2025-01-15", status: "completed" },
  { id: "BM-002", name: "Bias Detection Suite", model: "Claude-3.5", score: 91, metrics: { accuracy: 88, fairness: 95, robustness: 85, transparency: 92, safety: 90 }, date: "2025-01-14", status: "completed" },
  { id: "BM-003", name: "Safety Evaluation", model: "Llama-3-70B", score: 74, metrics: { accuracy: 80, fairness: 72, robustness: 68, transparency: 75, safety: 76 }, date: "2025-01-13", status: "completed" },
  { id: "BM-004", name: "PII Leakage Test", model: "GPT-4o-mini", score: 82, metrics: { accuracy: 85, fairness: 80, robustness: 82, transparency: 78, safety: 84 }, date: "2025-01-12", status: "completed" },
  { id: "BM-005", name: "Adversarial Robustness", model: "Mistral-Large", score: 0, metrics: { accuracy: 0, fairness: 0, robustness: 0, transparency: 0, safety: 0 }, date: "2025-01-15", status: "running" },
];

const scoreColor = (s: number) => s >= 85 ? "text-green-600" : s >= 70 ? "text-yellow-600" : s >= 50 ? "text-orange-600" : "text-red-600";
const barColor = (s: number) => s >= 85 ? "bg-green-500" : s >= 70 ? "bg-yellow-500" : s >= 50 ? "bg-orange-500" : "bg-red-500";

export default function Benchmark() {
  const [showRun, setShowRun] = useState(false);
  const [selected, setSelected] = useState<BenchmarkResult | null>(null);
  const [runForm, setRunForm] = useState({ name: "", model: "GPT-4o", suite: "EU AI Act Compliance" });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Benchmark</h1>
          <p className="text-gray-500 dark:text-gray-400">AI model evaluation and compliance benchmarking</p>
        </div>
        <button onClick={() => setShowRun(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Run Benchmark</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[{label: "Total Runs", value: RESULTS.length}, {label: "Avg Score", value: Math.round(RESULTS.filter(r=>r.status==="completed").reduce((a,b)=>a+b.score,0)/RESULTS.filter(r=>r.status==="completed").length)}, {label: "Models Tested", value: new Set(RESULTS.map(r=>r.model)).size}, {label: "Running", value: RESULTS.filter(r=>r.status==="running").length}].map(s => (
          <div key={s.label} className="border rounded-lg p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {RESULTS.map(r => (
            <div key={r.id} onClick={() => setSelected(r)}
              className={`border rounded-lg p-4 cursor-pointer transition hover:shadow-md ${selected?.id === r.id ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-500">{r.id}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{r.name}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${r.status === "completed" ? "bg-green-100 text-green-800" : r.status === "running" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}>{r.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{r.model} - {r.date}</span>
                {r.status === "completed" && <span className={`text-lg font-bold ${scoreColor(r.score)}`}>{r.score}/100</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          {selected && selected.status === "completed" ? (
            <div>
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">{selected.name}</h3>
              <div className="text-center mb-4">
                <span className={`text-4xl font-bold ${scoreColor(selected.score)}`}>{selected.score}</span>
                <span className="text-gray-400">/100</span>
              </div>
              <div className="space-y-3">
                {Object.entries(selected.metrics).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-gray-700 dark:text-gray-300">{k}</span>
                      <span className={`font-medium ${scoreColor(v)}`}>{v}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className={`h-2 rounded-full ${barColor(v)}`} style={{width: `${v}%`}} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t dark:border-gray-700 text-xs text-gray-400">
                <p>Model: {selected.model}</p>
                <p>Date: {selected.date}</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              <p className="text-lg">Select a benchmark</p>
              <p className="text-sm mt-1">Click a completed run to view details</p>
            </div>
          )}
        </div>
      </div>

      {showRun && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Run Benchmark</h3>
            <div className="space-y-3">
              <div><label className="text-sm text-gray-500">Benchmark Suite</label>
                <select value={runForm.suite} onChange={e => setRunForm({...runForm, suite: e.target.value})} className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  {["EU AI Act Compliance", "Bias Detection Suite", "Safety Evaluation", "PII Leakage Test", "Adversarial Robustness", "Full Compliance Suite"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="text-sm text-gray-500">Model</label>
                <select value={runForm.model} onChange={e => setRunForm({...runForm, model: e.target.value})} className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  {["GPT-4o", "GPT-4o-mini", "Claude-3.5", "Llama-3-70B", "Mistral-Large"].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowRun(false)} className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700">Start Run</button>
                <button onClick={() => setShowRun(false)} className="flex-1 border border-gray-300 dark:border-gray-600 py-2 rounded text-gray-700 dark:text-gray-300">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
