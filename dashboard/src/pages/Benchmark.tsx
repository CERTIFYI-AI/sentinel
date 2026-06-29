import { useState } from "react";
import { BarChart3, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface BenchmarkResult {
  model: string;
  provider: string;
  metrics: { name: string; score: number; baseline: number }[];
  lastRun: string;
  status: "passed" | "failed" | "warning";
}

const BENCHMARKS: BenchmarkResult[] = [
  {
    model: "GPT-4o", provider: "OpenAI", lastRun: "2025-01-15", status: "passed",
    metrics: [
      { name: "Accuracy", score: 94.2, baseline: 90 },
      { name: "Toxicity", score: 2.1, baseline: 5 },
      { name: "Hallucination", score: 8.3, baseline: 10 },
      { name: "Bias (Gender)", score: 3.2, baseline: 5 },
      { name: "Bias (Race)", score: 4.1, baseline: 5 },
      { name: "PII Leakage", score: 0.5, baseline: 1 },
      { name: "Latency P95 (ms)", score: 312, baseline: 500 },
      { name: "Robustness", score: 87.5, baseline: 80 },
    ],
  },
  {
    model: "Claude 3.5 Sonnet", provider: "Anthropic", lastRun: "2025-01-14", status: "passed",
    metrics: [
      { name: "Accuracy", score: 93.8, baseline: 90 },
      { name: "Toxicity", score: 1.2, baseline: 5 },
      { name: "Hallucination", score: 6.7, baseline: 10 },
      { name: "Bias (Gender)", score: 2.8, baseline: 5 },
      { name: "Bias (Race)", score: 3.4, baseline: 5 },
      { name: "PII Leakage", score: 0.3, baseline: 1 },
      { name: "Latency P95 (ms)", score: 287, baseline: 500 },
      { name: "Robustness", score: 91.2, baseline: 80 },
    ],
  },
  {
    model: "GPT-4o-mini", provider: "OpenAI", lastRun: "2025-01-13", status: "warning",
    metrics: [
      { name: "Accuracy", score: 88.1, baseline: 90 },
      { name: "Toxicity", score: 3.8, baseline: 5 },
      { name: "Hallucination", score: 12.4, baseline: 10 },
      { name: "Bias (Gender)", score: 4.6, baseline: 5 },
      { name: "Bias (Race)", score: 5.2, baseline: 5 },
      { name: "PII Leakage", score: 0.8, baseline: 1 },
      { name: "Latency P95 (ms)", score: 145, baseline: 500 },
      { name: "Robustness", score: 79.3, baseline: 80 },
    ],
  },
  {
    model: "Llama 3.1 70B", provider: "Meta", lastRun: "2025-01-10", status: "failed",
    metrics: [
      { name: "Accuracy", score: 82.5, baseline: 90 },
      { name: "Toxicity", score: 6.1, baseline: 5 },
      { name: "Hallucination", score: 15.2, baseline: 10 },
      { name: "Bias (Gender)", score: 6.8, baseline: 5 },
      { name: "Bias (Race)", score: 7.1, baseline: 5 },
      { name: "PII Leakage", score: 1.4, baseline: 1 },
      { name: "Latency P95 (ms)", score: 523, baseline: 500 },
      { name: "Robustness", score: 74.8, baseline: 80 },
    ],
  },
];

function isLowerBetter(name: string): boolean {
  return ["Toxicity", "Hallucination", "Bias (Gender)", "Bias (Race)", "PII Leakage", "Latency P95 (ms)"].includes(name);
}

function metricStatus(score: number, baseline: number, lowerBetter: boolean): "good" | "warn" | "bad" {
  if (lowerBetter) {
    if (score <= baseline * 0.8) return "good";
    if (score <= baseline) return "warn";
    return "bad";
  }
  if (score >= baseline * 1.05) return "good";
  if (score >= baseline) return "warn";
  return "bad";
}

const statusColors = { good: "text-green-600 dark:text-green-400", warn: "text-amber-600 dark:text-amber-400", bad: "text-red-600 dark:text-red-400" };
const statusBg = { good: "bg-green-50 dark:bg-green-950/50", warn: "bg-amber-50 dark:bg-amber-950/50", bad: "bg-red-50 dark:bg-red-950/50" };

export default function Benchmark() {
  const [selectedModel, setSelectedModel] = useState(0);
  const bench = BENCHMARKS[selectedModel];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-950 rounded-lg"><BarChart3 size={20} className="text-indigo-600 dark:text-indigo-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Benchmarks</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">AI safety, accuracy, and fairness benchmarking across all registered models</p>
          </div>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Run Benchmark Suite</button>
      </div>

      {/* Model Selector */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {BENCHMARKS.map((b, i) => (
          <button key={i} onClick={() => setSelectedModel(i)} className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
            selectedModel === i
              ? "bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
          }`}>
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${b.status === "passed" ? "bg-green-500" : b.status === "warning" ? "bg-amber-500" : "bg-red-500"}`} />
            {b.model}
          </button>
        ))}
      </div>

      {/* Benchmark Results */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{bench.model} — Benchmark Results</CardTitle>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Provider: {bench.provider}</span>
              <span>Last Run: {bench.lastRun}</span>
              <span className={`font-medium px-2 py-0.5 rounded capitalize ${
                bench.status === "passed" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" :
                bench.status === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
              }`}>{bench.status}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bench.metrics.map((m, i) => {
              const lowerBetter = isLowerBetter(m.name);
              const status = metricStatus(m.score, m.baseline, lowerBetter);
              const delta = lowerBetter ? m.baseline - m.score : m.score - m.baseline;
              const deltaPercent = ((delta / m.baseline) * 100).toFixed(1);
              const isPositive = delta > 0;
              return (
                <div key={i} className={`p-3 rounded-lg border border-slate-100 dark:border-slate-800 ${statusBg[status]}`}>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">{m.name}</p>
                  <div className="flex items-end justify-between mt-1">
                    <span className={`text-xl font-bold font-mono ${statusColors[status]}`}>
                      {m.name.includes("Latency") ? `${m.score}` : m.name === "Accuracy" || m.name === "Robustness" ? `${m.score}%` : `${m.score}%`}
                    </span>
                    <span className={`flex items-center gap-0.5 text-[11px] font-medium ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {isPositive ? <ArrowUpRight size={12} /> : delta < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                      {Math.abs(Number(deltaPercent))}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500">
                      <span>Baseline: {m.baseline}{m.name.includes("Latency") ? "ms" : "%"}</span>
                      <span className={statusColors[status]}>{status === "good" ? "PASS" : status === "warn" ? "WARN" : "FAIL"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cross-Model Comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Metric</th>
                  {BENCHMARKS.map(b => (
                    <th key={b.model} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">{b.model}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {BENCHMARKS[0].metrics.map((m, mi) => (
                  <tr key={mi} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300">{m.name}</td>
                    {BENCHMARKS.map(b => {
                      const metric = b.metrics[mi];
                      const lb = isLowerBetter(metric.name);
                      const status = metricStatus(metric.score, metric.baseline, lb);
                      return (
                        <td key={b.model} className={`px-4 py-2.5 text-xs font-mono font-bold ${statusColors[status]}`}>
                          {metric.score}{metric.name.includes("Latency") ? "ms" : "%"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
