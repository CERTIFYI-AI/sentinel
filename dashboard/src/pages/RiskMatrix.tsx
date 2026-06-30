import { useState } from "react";
import { AlertTriangle, Filter, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";

interface Risk {
  id: string;
  title: string;
  category: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  status: "open" | "mitigating" | "accepted" | "closed";
  owner: string;
  model?: string;
  trend: "increasing" | "stable" | "decreasing";
  lastUpdated: string;
  description: string;
}

const RISKS: Risk[] = [
  { id: "RSK-001", title: "PII leakage through model outputs", category: "Data Privacy", likelihood: 3, impact: 5, status: "mitigating", owner: "Security Team", model: "GPT-4o", trend: "decreasing", lastUpdated: "2025-01-15", description: "Model may expose personal data in generated responses despite PII filters" },
  { id: "RSK-002", title: "Algorithmic bias in hiring decisions", category: "Fairness & Bias", likelihood: 4, impact: 5, status: "open", owner: "Ethics Board", model: "Internal Classifier", trend: "stable", lastUpdated: "2025-01-14", description: "Gender and age bias detected in candidate scoring model" },
  { id: "RSK-003", title: "Model hallucination in legal advice", category: "Accuracy", likelihood: 3, impact: 4, status: "mitigating", owner: "Legal Tech", model: "Claude 3.5", trend: "decreasing", lastUpdated: "2025-01-13", description: "LLM generates fabricated case citations in legal research responses" },
  { id: "RSK-004", title: "Third-party model provider outage", category: "Availability", likelihood: 2, impact: 4, status: "accepted", owner: "Platform Team", trend: "stable", lastUpdated: "2025-01-12", description: "Dependency on external API availability for critical services" },
  { id: "RSK-005", title: "Training data copyright infringement", category: "Legal & IP", likelihood: 3, impact: 3, status: "open", owner: "Legal", model: "DALL-E 3", trend: "increasing", lastUpdated: "2025-01-11", description: "Generated images may infringe on copyrighted training data" },
  { id: "RSK-006", title: "Model drift in production", category: "Performance", likelihood: 4, impact: 3, status: "mitigating", owner: "ML Platform", model: "GPT-4o-mini", trend: "stable", lastUpdated: "2025-01-10", description: "Model performance degradation over time as data distribution shifts" },
  { id: "RSK-007", title: "Adversarial prompt injection", category: "Security", likelihood: 4, impact: 4, status: "mitigating", owner: "Security Team", trend: "increasing", lastUpdated: "2025-01-15", description: "Attackers may manipulate model behavior through crafted prompts" },
  { id: "RSK-008", title: "Non-compliance with EU AI Act", category: "Regulatory", likelihood: 2, impact: 5, status: "mitigating", owner: "Compliance", trend: "decreasing", lastUpdated: "2025-01-14", description: "Failure to meet mandatory AI governance requirements before deadline" },
];

const likelihoodLabels = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const impactLabels = ["", "Negligible", "Minor", "Moderate", "Major", "Severe"];
const trendIcons = { increasing: TrendingUp, stable: Minus, decreasing: TrendingDown };
const trendColors = { increasing: "text-[hsl(var(--s-er-tx))]", stable: "text-[hsl(var(--text-4))]", decreasing: "text-[hsl(var(--s-ok-tx))]" };
const statusColors: Record<string, string> = {
  open: "bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]",
  mitigating: "bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]",
  accepted: "bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))]",
  closed: "bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]",
};

function getHeatmapColor(likelihood: number, impact: number): string {
  const score = likelihood * impact;
  if (score >= 16) return "bg-[hsl(var(--s-er-tx))] text-[hsl(var(--bg-surface))]";
  if (score >= 10) return "bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--bg-surface))]";
  if (score >= 6) return "bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--bg-surface))]";
  if (score >= 3) return "bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--text-1))]";
  return "bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--text-1))]";
}

export default function RiskMatrix() {
  const [view, setView] = useState<"matrix" | "register">("matrix");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = categoryFilter === "all" ? RISKS : RISKS.filter(r => r.category === categoryFilter);
  const categories = [...new Set(RISKS.map(r => r.category))];

  const stats = {
    critical: RISKS.filter(r => r.likelihood * r.impact >= 16).length,
    high: RISKS.filter(r => { const s = r.likelihood * r.impact; return s >= 10 && s < 16; }).length,
    mitigating: RISKS.filter(r => r.status === "mitigating").length,
    open: RISKS.filter(r => r.status === "open").length,
  };

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Risk Matrix"
        subtitle="AI risk assessment aligned to ISO 31000 and NIST AI RMF"
        icon={AlertTriangle}
        actions={
          <>
            <div className="flex border border-[hsl(var(--border))] overflow-hidden">
              {(["matrix", "register"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${v === view ? "bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))]" : "bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-2))]"}`}>{v}</button>
              ))}
            </div>
            <Button size="sm" leftIcon={<Plus size={14} />}>Log Risk</Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Critical Risks", value: stats.critical, color: "text-[hsl(var(--s-er-tx))]" },
          { label: "High Risks", value: stats.high, color: "text-[hsl(var(--s-wn-tx))]" },
          { label: "Being Mitigated", value: stats.mitigating, color: "text-[hsl(var(--s-wn-tx))]" },
          { label: "Open / Unaddressed", value: stats.open, color: "text-[hsl(var(--s-er-tx))]" },
        ].map((s, i) => (
          <Card key={i} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-3))] font-medium">{s.label}</p>
              <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {view === "matrix" ? (
        <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Heatmap — Likelihood vs Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                <div className="flex">
                  <div className="w-24" />
                  {[1, 2, 3, 4, 5].map(impact => (
                    <div key={impact} className="flex-1 text-center text-[10px] font-medium text-[hsl(var(--text-3))] pb-2">
                      {impactLabels[impact]}
                    </div>
                  ))}
                </div>
                {[5, 4, 3, 2, 1].map(likelihood => (
                  <div key={likelihood} className="flex items-stretch">
                    <div className="w-24 flex items-center text-[10px] font-medium text-[hsl(var(--text-3))] pr-2 justify-end">
                      {likelihoodLabels[likelihood]}
                    </div>
                    {[1, 2, 3, 4, 5].map(impact => {
                      const risksInCell = RISKS.filter(r => r.likelihood === likelihood && r.impact === impact);
                      return (
                        <div key={impact} className={`flex-1 m-0.5 min-h-[60px] rounded-lg flex flex-col items-center justify-center p-1 ${getHeatmapColor(likelihood, impact)} ${risksInCell.length > 0 ? "ring-2 ring-[hsl(var(--bg-surface))]" : "opacity-60"}`}>
                          {risksInCell.length > 0 ? (
                            <div className="text-center">
                              <span className="text-lg font-bold">{risksInCell.length}</span>
                              <div className="text-[9px] leading-tight mt-0.5">
                                {risksInCell.map(r => r.id).join(", ")}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs opacity-50">{likelihood * impact}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="flex mt-2">
                  <div className="w-24" />
                  <div className="flex-1 text-center text-[10px] text-[hsl(var(--text-4))] font-medium">Impact &rarr;</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[hsl(var(--text-4))]" />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="text-sm border border-[hsl(var(--border))] rounded-lg px-3 py-2 bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-2))]">
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))]">
                    {["ID", "Risk", "Category", "L x I", "Score", "Status", "Owner", "Trend", "Updated"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider font-semibold text-[hsl(var(--text-3))]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {filtered.map(r => {
                    const score = r.likelihood * r.impact;
                    const TrendIcon = trendIcons[r.trend];
                    return (
                      <tr key={r.id} className="hover:bg-[hsl(var(--bg-raised))] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-3))]">{r.id}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[hsl(var(--text-1))] text-xs">{r.title}</p>
                          <p className="text-[11px] text-[hsl(var(--text-4))] mt-0.5 line-clamp-1">{r.description}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{r.category}</td>
                        <td className="px-4 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{r.likelihood} x {r.impact}</td>
                        <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded ${getHeatmapColor(r.likelihood, r.impact)}`}>{score}</span></td>
                        <td className="px-4 py-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${statusColors[r.status]}`}>{r.status}</span></td>
                        <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{r.owner}</td>
                        <td className="px-4 py-3"><TrendIcon size={14} className={trendColors[r.trend]} /></td>
                        <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{r.lastUpdated}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
