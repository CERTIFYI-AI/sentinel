import { useState } from "react";
import { Package, Search, Filter, Plus, ExternalLink, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface Model {
  id: string;
  name: string;
  provider: string;
  version: string;
  type: string;
  riskTier: "high" | "limited" | "minimal" | "unacceptable";
  status: "production" | "staging" | "deprecated" | "review";
  trustScore: number;
  lastAudit: string;
  owner: string;
  useCase: string;
  dataClassification: string;
  requests24h: number;
}

const MODELS: Model[] = [
  { id: "MDL-001", name: "GPT-4o", provider: "OpenAI", version: "2024-08-06", type: "Foundation LLM", riskTier: "high", status: "production", trustScore: 0.9312, lastAudit: "2025-01-14", owner: "ML Platform", useCase: "Customer support automation", dataClassification: "Confidential", requests24h: 45230 },
  { id: "MDL-002", name: "GPT-4o-mini", provider: "OpenAI", version: "2024-07-18", type: "Foundation LLM", riskTier: "limited", status: "production", trustScore: 0.8891, lastAudit: "2025-01-13", owner: "Product Team", useCase: "Content summarization", dataClassification: "Internal", requests24h: 128400 },
  { id: "MDL-003", name: "Claude 3.5 Sonnet", provider: "Anthropic", version: "2024-10-22", type: "Foundation LLM", riskTier: "high", status: "production", trustScore: 0.9456, lastAudit: "2025-01-15", owner: "Legal Tech", useCase: "Contract analysis", dataClassification: "Confidential", requests24h: 12870 },
  { id: "MDL-004", name: "Llama 3.1 70B", provider: "Meta (Self-hosted)", version: "3.1-70b-instruct", type: "Open Source LLM", riskTier: "limited", status: "staging", trustScore: 0.8234, lastAudit: "2025-01-10", owner: "Research", useCase: "Internal knowledge retrieval", dataClassification: "Internal", requests24h: 3420 },
  { id: "MDL-005", name: "text-embedding-3-large", provider: "OpenAI", version: "2024-01-25", type: "Embedding Model", riskTier: "minimal", status: "production", trustScore: 0.9801, lastAudit: "2025-01-12", owner: "Search Team", useCase: "Semantic search embeddings", dataClassification: "Internal", requests24h: 892100 },
  { id: "MDL-006", name: "Whisper Large V3", provider: "OpenAI", version: "v3", type: "Speech-to-Text", riskTier: "limited", status: "production", trustScore: 0.9102, lastAudit: "2025-01-08", owner: "Voice Team", useCase: "Call transcription", dataClassification: "PII", requests24h: 8930 },
  { id: "MDL-007", name: "Mistral Large 2", provider: "Mistral AI", version: "2407", type: "Foundation LLM", riskTier: "high", status: "review", trustScore: 0.7845, lastAudit: "2025-01-05", owner: "Innovation Lab", useCase: "Code generation", dataClassification: "Internal", requests24h: 0 },
  { id: "MDL-008", name: "DALL-E 3", provider: "OpenAI", version: "3.0", type: "Image Generation", riskTier: "limited", status: "deprecated", trustScore: 0.7102, lastAudit: "2024-12-20", owner: "Marketing", useCase: "Marketing asset generation", dataClassification: "Public", requests24h: 0 },
];

const riskColors: Record<string, string> = {
  unacceptable: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-800",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
  limited: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
  minimal: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border border-green-200 dark:border-green-800",
};

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  production: { color: "text-green-600 dark:text-green-400", icon: CheckCircle2 },
  staging: { color: "text-blue-600 dark:text-blue-400", icon: Clock },
  deprecated: { color: "text-slate-400 dark:text-slate-500", icon: XCircle },
  review: { color: "text-amber-600 dark:text-amber-400", icon: AlertTriangle },
};

const trustColor = (s: number) => s >= 0.85 ? "text-green-600 dark:text-green-400" : s >= 0.7 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

export default function ModelInventory() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Model | null>(null);

  const filtered = MODELS.filter(m => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.provider.toLowerCase().includes(search.toLowerCase())) return false;
    if (riskFilter !== "all" && m.riskTier !== riskFilter) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: MODELS.length,
    production: MODELS.filter(m => m.status === "production").length,
    highRisk: MODELS.filter(m => m.riskTier === "high" || m.riskTier === "unacceptable").length,
    avgTrust: (MODELS.reduce((s, m) => s + m.trustScore, 0) / MODELS.length),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg"><Package size={20} className="text-blue-600 dark:text-blue-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Model Inventory</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">AI/ML model registry with EU AI Act risk classification</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={14} /> Register Model
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Models", value: stats.total, sub: "Registered in inventory" },
          { label: "In Production", value: stats.production, sub: `${Math.round(stats.production / stats.total * 100)}% of inventory` },
          { label: "High Risk (EU AI Act)", value: stats.highRisk, sub: "Require enhanced oversight" },
          { label: "Avg Trust Score", value: stats.avgTrust.toFixed(4), sub: "Across all models" },
        ].map((s, i) => (
          <Card key={i} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
              <p className="text-2xl font-bold font-mono mt-1 text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search models or providers..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
            <option value="all">All Risk Tiers</option>
            <option value="high">High Risk</option>
            <option value="limited">Limited Risk</option>
            <option value="minimal">Minimal Risk</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
            <option value="all">All Statuses</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="review">Under Review</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>
      </div>

      {/* Model Table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  {["Model", "Provider", "Risk Tier", "Status", "Trust Score", "Data Class.", "24h Requests", "Last Audit", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(m => {
                  const sc = statusConfig[m.status];
                  const Icon = sc.icon;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors" onClick={() => setSelected(selected?.id === m.id ? null : m)}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{m.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{m.id} · {m.version}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{m.provider}</td>
                      <td className="px-4 py-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded ${riskColors[m.riskTier]}`}>{m.riskTier.toUpperCase()}</span></td>
                      <td className="px-4 py-3"><span className={`flex items-center gap-1.5 text-xs font-medium ${sc.color}`}><Icon size={12} />{m.status}</span></td>
                      <td className={`px-4 py-3 font-mono font-bold text-xs ${trustColor(m.trustScore)}`}>{m.trustScore.toFixed(4)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{m.dataClassification}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-slate-300">{m.requests24h > 0 ? m.requests24h.toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{m.lastAudit}</td>
                      <td className="px-4 py-3"><ExternalLink size={12} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
            <span>Showing {filtered.length} of {MODELS.length} models</span>
            <span>{MODELS.filter(m => m.requests24h > 0).reduce((s, m) => s + m.requests24h, 0).toLocaleString()} total requests (24h)</span>
          </div>
        </CardContent>
      </Card>

      {/* Detail Panel */}
      {selected && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package size={14} className="text-blue-500" />
              {selected.name} — Detail View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Owner", value: selected.owner },
                { label: "Use Case", value: selected.useCase },
                { label: "Model Type", value: selected.type },
                { label: "Data Classification", value: selected.dataClassification },
                { label: "EU AI Act Risk Tier", value: selected.riskTier.toUpperCase() },
                { label: "Trust Score", value: selected.trustScore.toFixed(4) },
                { label: "Last Audit Date", value: selected.lastAudit },
                { label: "Version", value: selected.version },
              ].map((d, i) => (
                <div key={i}>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">{d.label}</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">{d.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
