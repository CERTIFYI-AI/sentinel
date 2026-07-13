import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Package, Search, Filter, Plus, ExternalLink, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useModelsData } from "@/hooks/useModelsData";
import type { ModelRecord } from "@/services/modelService";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import ErrorState from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";

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

// Map the Supabase `ai_models` record (snake_case) to this page's view model.
// Type-safe, with explicit fallbacks — never assumes a column is present.
const RISK_TIERS = new Set<Model["riskTier"]>(["high", "limited", "minimal", "unacceptable"]);
const LIFECYCLE_TO_STATUS: Record<string, Model["status"]> = {
  production: "production", prod: "production", monitor: "production", monitoring: "production",
  staging: "staging", stage: "staging", test: "staging", dev: "staging", development: "staging",
  deprecated: "deprecated", retired: "deprecated",
  review: "review", pending: "review",
};
function mapRecordToModel(r: ModelRecord): Model {
  const meta = (r.metadata ?? {}) as Record<string, unknown>;
  const tier = (r.risk_tier ?? "").toLowerCase();
  const stage = (r.lifecycle_stage ?? "").toLowerCase();
  const requests = typeof meta.requests_24h === "number" ? meta.requests_24h : 0;
  const classification = typeof meta.data_classification === "string" ? meta.data_classification : "Internal";
  return {
    id: r.id,
    name: r.name,
    provider: r.provider ?? "—",
    version: r.version ?? "—",
    type: r.model_type ?? "—",
    riskTier: RISK_TIERS.has(tier as Model["riskTier"]) ? (tier as Model["riskTier"]) : "limited",
    status: LIFECYCLE_TO_STATUS[stage] ?? "review",
    trustScore: typeof r.trust_score === "number" ? r.trust_score : 0,
    lastAudit: (r.updated_at ?? r.created_at ?? "").slice(0, 10) || "—",
    owner: r.business_owner ?? r.technical_owner ?? "—",
    useCase: r.use_case ?? "—",
    dataClassification: classification,
    requests24h: requests,
  };
}

// EU AI Act risk tiers → design tokens (critical/high/medium/low scales).
const riskColors: Record<string, string> = {
  unacceptable: "bg-[hsl(var(--r-cr-bg))] text-[hsl(var(--r-cr-tx))] border border-[hsl(var(--r-cr-br))]",
  high:         "bg-[hsl(var(--r-hi-bg))] text-[hsl(var(--r-hi-tx))] border border-[hsl(var(--r-hi-br))]",
  limited:      "bg-[hsl(var(--r-md-bg))] text-[hsl(var(--r-md-tx))] border border-[hsl(var(--r-md-br))]",
  minimal:      "bg-[hsl(var(--r-lo-bg))] text-[hsl(var(--r-lo-tx))] border border-[hsl(var(--r-lo-br))]",
};

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  production: { color: "text-[hsl(var(--s-ok-tx))]", icon: CheckCircle2 },
  staging:    { color: "text-[hsl(var(--s-in-tx))]", icon: Clock },
  deprecated: { color: "text-[hsl(var(--text-4))]",  icon: XCircle },
  review:     { color: "text-[hsl(var(--s-wn-tx))]", icon: AlertTriangle },
};

const trustColor = (s: number) => s >= 0.85 ? "text-[hsl(var(--s-ok-tx))]" : s >= 0.7 ? "text-[hsl(var(--s-wn-tx))]" : "text-[hsl(var(--s-er-tx))]";

export default function ModelInventory() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Model | null>(null);

  // Real mode → Supabase (`ai_models`); demo mode (no env) → deterministic seed.
  const live = isSupabaseConfigured();
  const { models: records, isLoading, error } = useModelsData();
  const data: Model[] = live ? records.map(mapRecordToModel) : MODELS;

  const filtered = data.filter(m => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.provider.toLowerCase().includes(search.toLowerCase())) return false;
    if (riskFilter !== "all" && m.riskTier !== riskFilter) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: data.length,
    production: data.filter(m => m.status === "production").length,
    highRisk: data.filter(m => m.riskTier === "high" || m.riskTier === "unacceptable").length,
    avgTrust: data.length ? (data.reduce((s, m) => s + m.trustScore, 0) / data.length) : 0,
  };

  // Loading / error states only apply in real (Supabase) mode.
  if (live && isLoading) return <PageSkeleton />;
  if (live && error) return <div className="p-6"><ErrorState title="Could not load models" error={error} onRetry={() => window.location.reload()} /></div>;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Model Inventory"
        subtitle="AI/ML model registry with EU AI Act risk classification"
        icon={Package}
        actions={
          <Button size="sm" leftIcon={<Plus size={14} />}>Register Model</Button>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Models", value: stats.total, sub: "Registered in inventory" },
          { label: "In Production", value: stats.production, sub: stats.total ? `${Math.round(stats.production / stats.total * 100)}% of inventory` : "—" },
          { label: "High Risk (EU AI Act)", value: stats.highRisk, sub: "Require enhanced oversight" },
          { label: "Avg Trust Score", value: stats.avgTrust.toFixed(4), sub: "Across all models" },
        ].map((s, i) => (
          <Card key={i} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-4))] font-medium">{s.label}</p>
              <p className="text-2xl font-bold font-mono mt-1 text-[hsl(var(--text-1))]">{s.value}</p>
              <p className="text-[11px] text-[hsl(var(--text-4))] mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search models or providers..." className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:ring-2 focus:ring-[hsl(var(--brand))] focus:border-[hsl(var(--brand))] outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[hsl(var(--text-4))]" />
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All Risk Tiers</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
              <SelectItem value="limited">Limited Risk</SelectItem>
              <SelectItem value="minimal">Minimal Risk</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="review">Under Review</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Model Table */}
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))]">
                  {["Model", "Provider", "Risk Tier", "Status", "Trust Score", "Data Class.", "24h Requests", "Last Audit", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider font-semibold text-[hsl(var(--text-3))]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filtered.map(m => {
                  const sc = statusConfig[m.status] ?? statusConfig.review;
                  const Icon = sc.icon;
                  return (
                    <tr key={m.id} className="hover:bg-[hsl(var(--bg-raised))] cursor-pointer transition-colors" onClick={() => setSelected(selected?.id === m.id ? null : m)}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[hsl(var(--text-1))]">{m.name}</div>
                        <div className="text-[11px] text-[hsl(var(--text-4))] font-mono">{m.id} · {m.version}</div>
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--text-2))]">{m.provider}</td>
                      <td className="px-4 py-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded ${riskColors[m.riskTier]}`}>{m.riskTier.toUpperCase()}</span></td>
                      <td className="px-4 py-3"><span className={`flex items-center gap-1.5 text-xs font-medium ${sc.color}`}><Icon size={12} />{m.status}</span></td>
                      <td className={`px-4 py-3 font-mono font-bold text-xs ${trustColor(m.trustScore)}`}>{m.trustScore.toFixed(4)}</td>
                      <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{m.dataClassification}</td>
                      <td className="px-4 py-3 text-xs font-mono text-[hsl(var(--text-2))]">{m.requests24h > 0 ? m.requests24h.toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{m.lastAudit}</td>
                      <td className="px-4 py-3"><ExternalLink size={12} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]" /></td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10">
                      <EmptyState
                        icon={<Package size={28} />}
                        title={data.length === 0 ? "No models registered yet" : "No models match your filters"}
                        description={data.length === 0
                          ? (live ? "Register a model or run the seed migration to populate the AI model registry." : "Demo data is unavailable.")
                          : "Adjust the search or filters to see results."}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-xs text-[hsl(var(--text-3))] border-t border-[hsl(var(--border))]">
            <span>Showing {filtered.length} of {data.length} models</span>
            <span>{data.filter(m => m.requests24h > 0).reduce((s, m) => s + m.requests24h, 0).toLocaleString()} total requests (24h)</span>
          </div>
        </CardContent>
      </Card>

      {/* Detail Panel */}
      {selected && (
        <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package size={14} className="text-[hsl(var(--s-in-tx))]" />
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
                  <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-4))] font-medium">{d.label}</p>
                  <p className="text-sm font-medium text-[hsl(var(--text-1))] mt-0.5">{d.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
