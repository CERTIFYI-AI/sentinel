import { useState } from "react";
import { Scale, Download, ChevronDown, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface Framework {
  id: string; name: string; flag: string; score: number; passing: number; total: number;
  status: "mandatory" | "certifiable" | "voluntary"; enabled: boolean; lastEvidence: string;
}

const FRAMEWORKS: Framework[] = [
  { id: "eu-ai-act", name: "EU AI Act", flag: "🇪🇺", score: 87, passing: 34, total: 39, status: "mandatory", enabled: true, lastEvidence: "2m ago" },
  { id: "gdpr", name: "GDPR", flag: "🇪🇺", score: 92, passing: 44, total: 48, status: "mandatory", enabled: true, lastEvidence: "5m ago" },
  { id: "nist-ai-rmf", name: "NIST AI RMF", flag: "🇺🇸", score: 78, passing: 28, total: 36, status: "certifiable", enabled: true, lastEvidence: "12m ago" },
  { id: "iso-42001", name: "ISO 42001", flag: "🌐", score: 71, passing: 22, total: 31, status: "certifiable", enabled: true, lastEvidence: "1h ago" },
  { id: "soc2", name: "SOC 2 Type II", flag: "🇺🇸", score: 95, passing: 19, total: 20, status: "certifiable", enabled: true, lastEvidence: "3m ago" },
  { id: "ieee-7000", name: "IEEE 7000", flag: "🌐", score: 64, passing: 9, total: 14, status: "voluntary", enabled: false, lastEvidence: "45m ago" },
  { id: "iso-27001", name: "ISO 27001", flag: "🌐", score: 83, passing: 31, total: 37, status: "certifiable", enabled: true, lastEvidence: "8m ago" },
];

const statusBadge: Record<string, string> = {
  mandatory: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-800",
  certifiable: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
  voluntary: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border border-green-200 dark:border-green-800",
};

const scoreColor = (s: number) => s >= 85 ? "text-green-600 dark:text-green-400" : s >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
const barColor = (s: number) => s >= 85 ? "bg-green-500" : s >= 70 ? "bg-amber-500" : "bg-red-500";

export default function ComplianceDashboard() {
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg"><Scale size={20} className="text-green-600 dark:text-green-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Compliance</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Real-time evidence accumulation across {frameworks.length} global AI governance frameworks</p>
          </div>
        </div>
        <button onClick={generateReport} disabled={generating} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
          <Download size={14} />
          {generating ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {reportReady && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-green-600 dark:text-green-400 text-lg">{"✓"}</span>
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Compliance Report Ready</p>
              <p className="text-xs text-green-600 dark:text-green-400">{enabled.length} frameworks · {enabled.reduce((s,f) => s + f.total, 0)} controls analyzed · Overall score: {overallScore}%</p>
            </div>
          </div>
          <button className="text-sm text-green-700 dark:text-green-400 hover:underline font-medium">Download JSON</button>
        </div>
      )}

      {/* Overall Governance Score */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <CardContent className="p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">AI Governance Score</h3>
            <span className={`text-3xl font-mono font-bold ${scoreColor(overallScore)}`}>{overallScore}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-4">
            <div className={`h-2 rounded-full ${barColor(overallScore)} transition-all duration-700`} style={{width: `${overallScore}%`}} />
          </div>
          <div className="grid grid-cols-5 gap-4 text-center">
            {[{l: "Trust Enforcement", v: 91}, {l: "PII Protection", v: 88}, {l: "Audit Coverage", v: 94}, {l: "HITL Compliance", v: 82}, {l: "Drift Detection", v: 76}].map(c => (
              <div key={c.l}>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{c.l}</p>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                  <div className={`h-1 rounded-full ${barColor(c.v)}`} style={{width: `${c.v}%`}} />
                </div>
                <p className={`text-xs font-mono font-bold mt-1 ${scoreColor(c.v)}`}>{c.v}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Framework Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {frameworks.map(fw => (
          <Card key={fw.id} className={`transition-all ${fw.enabled ? "bg-white dark:bg-slate-900 border-green-300 dark:border-green-700 shadow-sm" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-60"}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{fw.flag}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{fw.name}</span>
                </div>
                <button onClick={() => toggle(fw.id)} className={`w-10 h-5 rounded-full relative transition-colors ${fw.enabled ? "bg-green-500" : "bg-slate-300 dark:bg-slate-700"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${fw.enabled ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${statusBadge[fw.status]}`}>{fw.status}</span>
              <div className="mt-3">
                <div className="flex justify-between items-end">
                  <span className={`text-2xl font-mono font-bold ${scoreColor(fw.score)}`}>{fw.score}%</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{fw.passing}/{fw.total} controls</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2">
                  <div className={`h-1.5 rounded-full ${barColor(fw.score)} transition-all`} style={{width: `${fw.score}%`}} />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Last evidence: {fw.lastEvidence}</p>
              </div>
              <button onClick={() => setSelectedFw(fw.id === selectedFw ? null : fw.id)} className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline mt-2 font-medium">
                View Evidence <ChevronDown size={10} className={`transition-transform ${selectedFw === fw.id ? "rotate-180" : ""}`} />
              </button>
              {selectedFw === fw.id && (
                <div className="mt-2 bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Trust score monitoring: Active</p>
                  <p className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${fw.score > 80 ? "bg-green-500" : "bg-amber-500"}`} /> PII detection: {fw.score > 80 ? "Passing" : "Needs review"}</p>
                  <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Audit chain integrity: Verified</p>
                  <p className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${fw.enabled ? "bg-green-500" : "bg-slate-400"}`} /> Evidence auto-collection: {fw.enabled ? "Enabled" : "Disabled"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
