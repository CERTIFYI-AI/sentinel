import { useState } from "react";
import { Globe, Search, Shield, AlertTriangle, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";

interface Vendor {
  id: string;
  name: string;
  type: string;
  riskRating: "critical" | "high" | "medium" | "low";
  complianceScore: number;
  certifications: string[];
  dataProcessing: string;
  contractExpiry: string;
  lastAssessment: string;
  status: "approved" | "under-review" | "conditional" | "rejected";
  subProcessors: number;
  region: string;
}

const VENDORS: Vendor[] = [
  { id: "VEN-001", name: "OpenAI", type: "LLM Provider", riskRating: "high", complianceScore: 82, certifications: ["SOC 2", "ISO 27001"], dataProcessing: "US-based, DPA signed", contractExpiry: "2025-12-31", lastAssessment: "2025-01-10", status: "approved", subProcessors: 12, region: "US" },
  { id: "VEN-002", name: "Anthropic", type: "LLM Provider", riskRating: "high", complianceScore: 88, certifications: ["SOC 2"], dataProcessing: "US-based, DPA signed", contractExpiry: "2025-09-30", lastAssessment: "2025-01-12", status: "approved", subProcessors: 8, region: "US" },
  { id: "VEN-003", name: "Mistral AI", type: "LLM Provider", riskRating: "medium", complianceScore: 75, certifications: ["GDPR compliant"], dataProcessing: "EU-based, DPA pending", contractExpiry: "2025-06-30", lastAssessment: "2025-01-05", status: "under-review", subProcessors: 4, region: "EU" },
  { id: "VEN-004", name: "Pinecone", type: "Vector Database", riskRating: "medium", complianceScore: 90, certifications: ["SOC 2", "GDPR"], dataProcessing: "US/EU, DPA signed", contractExpiry: "2025-11-15", lastAssessment: "2024-12-20", status: "approved", subProcessors: 3, region: "US/EU" },
  { id: "VEN-005", name: "Cohere", type: "LLM Provider", riskRating: "medium", complianceScore: 72, certifications: ["SOC 2"], dataProcessing: "Canada, DPA signed", contractExpiry: "2025-08-01", lastAssessment: "2024-12-15", status: "conditional", subProcessors: 6, region: "CA" },
  { id: "VEN-006", name: "AWS Bedrock", type: "Model Hosting", riskRating: "low", complianceScore: 95, certifications: ["SOC 2", "ISO 27001", "HIPAA", "FedRAMP"], dataProcessing: "Multi-region, DPA signed", contractExpiry: "2026-03-31", lastAssessment: "2025-01-08", status: "approved", subProcessors: 0, region: "Global" },
];

const riskColors: Record<string, string> = {
  critical: "bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]",
  high: "bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]",
  medium: "bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]",
  low: "bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]",
};

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  approved: { color: "text-[hsl(var(--s-ok-tx))]", icon: CheckCircle2 },
  "under-review": { color: "text-[hsl(var(--s-wn-tx))]", icon: Clock },
  conditional: { color: "text-[hsl(var(--s-in-tx))]", icon: AlertTriangle },
  rejected: { color: "text-[hsl(var(--s-er-tx))]", icon: Shield },
};

const scoreColor = (s: number) => s >= 85 ? "text-[hsl(var(--s-ok-tx))]" : s >= 70 ? "text-[hsl(var(--s-wn-tx))]" : "text-[hsl(var(--s-er-tx))]";
const barColor = (s: number) => s >= 85 ? "bg-[hsl(var(--s-ok-tx))]" : s >= 70 ? "bg-[hsl(var(--s-wn-tx))]" : "bg-[hsl(var(--s-er-tx))]";

export default function Vendors() {
  const [search, setSearch] = useState("");
  const filtered = search ? VENDORS.filter(v => v.name.toLowerCase().includes(search.toLowerCase())) : VENDORS;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendor Register"
        subtitle="Third-party AI vendor risk management and compliance tracking"
        icon={Globe}
        actions={
          <button className="flex items-center gap-2 bg-[hsl(var(--s-ok-tx))] hover:bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] px-4 py-2 text-sm font-medium transition-colors">
            <Globe size={14} /> Add Vendor
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Vendors", value: VENDORS.length },
          { label: "Approved", value: VENDORS.filter(v => v.status === "approved").length },
          { label: "High Risk", value: VENDORS.filter(v => v.riskRating === "high" || v.riskRating === "critical").length },
          { label: "Avg Compliance", value: `${Math.round(VENDORS.reduce((s, v) => s + v.complianceScore, 0) / VENDORS.length)}%` },
        ].map((s, i) => (
          <Card key={i} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-3))] font-medium">{s.label}</p>
              <p className="text-2xl font-bold font-mono mt-1 text-[hsl(var(--text-1))] dark:text-[hsl(var(--bg-surface))]">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..." className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] dark:text-[hsl(var(--bg-surface))] placeholder:text-[hsl(var(--text-4))] focus:ring-2 focus:ring-[hsl(var(--s-ok-br))] focus:border-[hsl(var(--s-ok-br))] outline-none" />
      </div>

      {/* Vendor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(v => {
          const sc = statusConfig[v.status];
          const Icon = sc.icon;
          return (
            <Card key={v.id} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm text-[hsl(var(--text-1))] dark:text-[hsl(var(--bg-surface))]">{v.name}</h3>
                    <p className="text-[11px] text-[hsl(var(--text-3))]">{v.type} · {v.region}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${riskColors[v.riskRating]}`}>{v.riskRating} risk</span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Icon size={12} className={sc.color} />
                  <span className={`text-xs font-medium capitalize ${sc.color}`}>{v.status.replace("-", " ")}</span>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[hsl(var(--text-3))]">Compliance Score</span>
                    <span className={`font-mono font-bold ${scoreColor(v.complianceScore)}`}>{v.complianceScore}%</span>
                  </div>
                  <div className="w-full bg-[hsl(var(--bg-muted))] rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${barColor(v.complianceScore)} transition-all`} style={{ width: `${v.complianceScore}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {v.certifications.map(c => (
                    <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))] border border-[hsl(var(--border))]">{c}</span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[hsl(var(--text-3))] border-t border-[hsl(var(--border))] pt-3">
                  <div>Sub-processors: <span className="font-medium text-[hsl(var(--text-2))]">{v.subProcessors}</span></div>
                  <div>Contract: <span className="font-medium text-[hsl(var(--text-2))]">{v.contractExpiry}</span></div>
                  <div>Last assessed: <span className="font-medium text-[hsl(var(--text-2))]">{v.lastAssessment}</span></div>
                  <div className="flex items-center gap-1">
                    <ExternalLink size={10} />
                    <span className="text-[hsl(var(--s-ok-tx))] cursor-pointer hover:underline">DPA</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
