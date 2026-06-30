import { useState } from "react";
import { Globe, Search, Shield, AlertTriangle, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

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
  critical: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  low: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
};

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  approved: { color: "text-green-600 dark:text-green-400", icon: CheckCircle2 },
  "under-review": { color: "text-amber-600 dark:text-amber-400", icon: Clock },
  conditional: { color: "text-blue-600 dark:text-blue-400", icon: AlertTriangle },
  rejected: { color: "text-red-600 dark:text-red-400", icon: Shield },
};

const scoreColor = (s: number) => s >= 85 ? "text-green-600 dark:text-green-400" : s >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
const barColor = (s: number) => s >= 85 ? "bg-green-500" : s >= 70 ? "bg-amber-500" : "bg-red-500";

export default function Vendors() {
  const [search, setSearch] = useState("");
  const filtered = search ? VENDORS.filter(v => v.name.toLowerCase().includes(search.toLowerCase())) : VENDORS;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg"><Globe size={20} className="text-purple-600 dark:text-purple-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Vendor Register</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Third-party AI vendor risk management and compliance tracking</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Globe size={14} /> Add Vendor
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Vendors", value: VENDORS.length },
          { label: "Approved", value: VENDORS.filter(v => v.status === "approved").length },
          { label: "High Risk", value: VENDORS.filter(v => v.riskRating === "high" || v.riskRating === "critical").length },
          { label: "Avg Compliance", value: `${Math.round(VENDORS.reduce((s, v) => s + v.complianceScore, 0) / VENDORS.length)}%` },
        ].map((s, i) => (
          <Card key={i} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
              <p className="text-2xl font-bold font-mono mt-1 text-slate-900 dark:text-white">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
      </div>

      {/* Vendor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(v => {
          const sc = statusConfig[v.status];
          const Icon = sc.icon;
          return (
            <Card key={v.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{v.name}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{v.type} · {v.region}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${riskColors[v.riskRating]}`}>{v.riskRating} risk</span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Icon size={12} className={sc.color} />
                  <span className={`text-xs font-medium capitalize ${sc.color}`}>{v.status.replace("-", " ")}</span>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-500 dark:text-slate-400">Compliance Score</span>
                    <span className={`font-mono font-bold ${scoreColor(v.complianceScore)}`}>{v.complianceScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${barColor(v.complianceScore)} transition-all`} style={{ width: `${v.complianceScore}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {v.certifications.map(c => (
                    <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{c}</span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div>Sub-processors: <span className="font-medium text-slate-700 dark:text-slate-300">{v.subProcessors}</span></div>
                  <div>Contract: <span className="font-medium text-slate-700 dark:text-slate-300">{v.contractExpiry}</span></div>
                  <div>Last assessed: <span className="font-medium text-slate-700 dark:text-slate-300">{v.lastAssessment}</span></div>
                  <div className="flex items-center gap-1">
                    <ExternalLink size={10} />
                    <span className="text-green-600 dark:text-green-400 cursor-pointer hover:underline">DPA</span>
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
