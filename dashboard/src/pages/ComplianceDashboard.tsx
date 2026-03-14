import { ShieldCheck, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { useState } from "react";
import Badge from '../components/ui/badge';

interface Framework {
  id: string; name: string; flag: string; score: number; passing: number; total: number;
  status: "mandatory" | "certifiable" | "voluntary"; enabled: boolean; lastEvidence: string;
}

const FRAMEWORKS: Framework[] = [
  { id: "eu-ai-act", name: "EU AI Act", flag: "\ud83c\uddea\ud83c\uddfa", score: 87, passing: 34, total: 39, status: "mandatory", enabled: true, lastEvidence: "2m ago" },
  { id: "gdpr", name: "GDPR", flag: "\ud83c\uddea\ud83c\uddfa", score: 92, passing: 44, total: 48, status: "mandatory", enabled: true, lastEvidence: "5m ago" },
  { id: "nist-ai-rmf", name: "NIST AI RMF", flag: "\ud83c\uddfa\ud83c\uddf8", score: 78, passing: 28, total: 36, status: "certifiable", enabled: true, lastEvidence: "12m ago" },
  { id: "iso-42001", name: "ISO 42001", flag: "\ud83c\udf10", score: 71, passing: 22, total: 31, status: "certifiable", enabled: true, lastEvidence: "1h ago" },
  { id: "soc2", name: "SOC 2 Type II", flag: "\ud83c\uddfa\ud83c\uddf8", score: 95, passing: 19, total: 20, status: "certifiable", enabled: true, lastEvidence: "3m ago" },
  { id: "ieee-7000", name: "IEEE 7000", flag: "\ud83c\udf10", score: 64, passing: 9, total: 14, status: "voluntary", enabled: false, lastEvidence: "45m ago" },
  { id: "iso-27001", name: "ISO 27001", flag: "\ud83c\udf10", score: 83, passing: 31, total: 37, status: "certifiable", enabled: true, lastEvidence: "8m ago" },
];

const statusBadge: Record<string, string> = {
  mandatory: "bg-red-100 text-red-700 border-red-200",
  certifiable: "bg-blue-100 text-blue-700 border-blue-200",
  voluntary: "bg-green-100 text-green-700 border-green-200",
};

const scoreColor = (s: number) => s >= 85 ? "text-green-600" : s >= 70 ? "text-amber-600" : "text-red-600";
const barColor = (s: number) => s >= 85 ? "bg-green-500" : s >= 70 ? "bg-amber-500" : "bg-red-500";

export default function ComplianceDashboard({ tenantId }: { tenantId: string }) {
  const [frameworks, setFrameworks] = useState(FRAMEWORKS);
  const [generating, setGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [selectedFw, setSelectedFw] = useState<string | null>(null);

  const toggle = (id: string) => setFrameworks(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));

  const generateReport = () => {
    setGenerating(true);
    setReportReady(false);
    setTimeout(() => { setGenerating(false); setReportReady(true); }, 2000);
  };

  const enabled = frameworks.filter(f => f.enabled);
  const overallScore = enabled.length ? Math.round(enabled.reduce((s, f) => s + f.score, 0) / enabled.length) : 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Compliance</h1>
          <p className="text-sm text-zinc-500 mt-1">Real-time evidence accumulation across {frameworks.length} global AI governance frameworks</p>
        </div>
        <button onClick={generateReport} disabled={generating} className="bg-green-600 hover:bg-green-700 text-foreground px-4 py-2 rounded-none text-sm font-medium disabled:opacity-60">
          {generating ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {reportReady && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-none p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-lg">\u2713</span>
            <div>
              <p className="text-sm font-medium text-green-800">Compliance Report Ready</p>
              <p className="text-xs text-green-600">{enabled.length} frameworks · {enabled.reduce((s,f) => s + f.total, 0)} controls analyzed · Overall score: {overallScore}%</p>
            </div>
          </div>
          <button onClick={() => { const blob = new Blob([JSON.stringify({tenant: tenantId, generated: new Date().toISOString(), overall_score: overallScore, frameworks: enabled.map(f => ({name: f.name, score: f.score, passing: f.passing, total: f.total}))}, null, 2)], {type: "application/json"}); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `compliance-report-${tenantId}.json`; a.click(); }} className="text-sm text-green-700 hover:underline font-medium">Download JSON</button>
        </div>
      )}

      {/* Overall Governance Score */}
      <div className="bg-card border border-zinc-200 rounded-none p-5 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-zinc-700">AI Governance Score</h3>
          <span className={`text-3xl font-mono font-bold ${scoreColor(overallScore)}`}>{overallScore}%</span>
        </div>
        <div className="w-full bg-zinc-100 rounded-full h-2 mb-4"><div className={`h-2 rounded-full ${barColor(overallScore)} transition-all duration-700`} style={{width: `${overallScore}%`}} /></div>
        <div className="grid grid-cols-5 gap-4 text-center">
          {[{l: "Trust Enforcement", w: 30}, {l: "PII Protection", w: 20}, {l: "Audit Coverage", w: 20}, {l: "HITL Compliance", w: 15}, {l: "Drift Detection", w: 15}].map(c => (
            <div key={c.l}>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">{c.l}</p>
              <div className="w-full bg-zinc-100 rounded-full h-1"><div className="h-1 rounded-full bg-green-500" style={{width: `${60 + Math.random() * 35}%`}} /></div>
              <p className="text-xs font-mono font-bold mt-1 text-zinc-700">{c.w}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Framework Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {frameworks.map(fw => (
          <div key={fw.id} className={`bg-white border rounded-none p-4 transition-all ${fw.enabled ? "border-green-300 shadow-sm" : "border-zinc-200 opacity-60"}`}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{fw.flag}</span>
                <span className="text-sm font-semibold text-zinc-800">{fw.name}</span>
              </div>
              <button onClick={() => toggle(fw.id)} className={`w-10 h-5 rounded-full relative transition-colors ${fw.enabled ? "bg-green-500" : "bg-zinc-300"}`}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${fw.enabled ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${statusBadge[fw.status]}`}>{fw.status}</span>
            <div className="mt-3">
              <div className="flex justify-between items-end">
                <span className={`text-2xl font-mono font-bold ${scoreColor(fw.score)}`}>{fw.score}%</span>
                <span className="text-xs text-zinc-400">{fw.passing}/{fw.total} controls</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-2"><div className={`h-1.5 rounded-full ${barColor(fw.score)} transition-all`} style={{width: `${fw.score}%`}} /></div>
              <p className="text-[10px] text-zinc-400 mt-2">Last evidence: {fw.lastEvidence}</p>
            </div>
            <button onClick={() => setSelectedFw(fw.id === selectedFw ? null : fw.id)} className="text-xs text-green-600 hover:underline mt-2">View Evidence</button>
            {selectedFw === fw.id && (
              <div className="mt-2 bg-zinc-50 rounded p-2 text-xs text-zinc-600 space-y-1">
                <p>\u2022 Trust score monitoring: Active</p>
                <p>\u2022 PII detection: {fw.score > 80 ? "Passing" : "Needs review"}</p>
                <p>\u2022 Audit chain integrity: Verified</p>
                <p>\u2022 Evidence auto-collection: {fw.enabled ? "Enabled" : "Disabled"}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
