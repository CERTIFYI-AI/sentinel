import { useState } from "react";
import { Database, Search, Plus, FileText, Clock, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface Dataset {
  id: string;
  name: string;
  description: string;
  type: "safety" | "accuracy" | "fairness" | "custom";
  samples: number;
  format: "JSONL" | "CSV" | "Parquet";
  createdBy: string;
  createdAt: string;
  lastUsed: string;
  tags: string[];
}

const DATASETS: Dataset[] = [
  { id: "ds-001", name: "MMLU-Pro Safety Subset", description: "Curated subset of MMLU focusing on safety-critical domains including medical, legal, and financial", type: "safety", samples: 14200, format: "JSONL", createdBy: "ML Platform", createdAt: "2025-01-10", lastUsed: "2025-01-15", tags: ["safety", "medical", "legal"] },
  { id: "ds-002", name: "TruthfulQA Enhanced", description: "Extended TruthfulQA with domain-specific hallucination detection prompts", type: "accuracy", samples: 8940, format: "JSONL", createdBy: "Research", createdAt: "2025-01-08", lastUsed: "2025-01-14", tags: ["hallucination", "truthfulness"] },
  { id: "ds-003", name: "BBQ Bias Benchmark", description: "Bias Benchmark for QA — measures social biases across 9 protected categories", type: "fairness", samples: 58492, format: "JSONL", createdBy: "Ethics Board", createdAt: "2025-01-05", lastUsed: "2025-01-13", tags: ["bias", "fairness", "demographics"] },
  { id: "ds-004", name: "PII Detection Suite", description: "Synthetic dataset with embedded PII patterns for testing detection accuracy", type: "safety", samples: 25000, format: "CSV", createdBy: "Security Team", createdAt: "2025-01-03", lastUsed: "2025-01-15", tags: ["pii", "privacy", "detection"] },
  { id: "ds-005", name: "Legal Compliance QA", description: "Question-answer pairs from EU AI Act, GDPR, and NIST AI RMF compliance scenarios", type: "custom", samples: 3200, format: "JSONL", createdBy: "Legal Tech", createdAt: "2024-12-20", lastUsed: "2025-01-12", tags: ["compliance", "regulation", "eu-ai-act"] },
  { id: "ds-006", name: "Adversarial Prompts v2", description: "Red-team generated adversarial prompts for testing model robustness and jailbreak resistance", type: "safety", samples: 4800, format: "JSONL", createdBy: "Security Team", createdAt: "2024-12-15", lastUsed: "2025-01-11", tags: ["adversarial", "red-team", "robustness"] },
  { id: "ds-007", name: "Customer Support Golden", description: "Curated multi-turn customer support conversations with quality-scored responses", type: "accuracy", samples: 12400, format: "Parquet", createdBy: "Product Team", createdAt: "2024-12-10", lastUsed: "2025-01-10", tags: ["multi-turn", "support", "quality"] },
  { id: "ds-008", name: "Financial Accuracy Test", description: "Financial calculations and reporting accuracy verification dataset", type: "accuracy", samples: 6700, format: "CSV", createdBy: "Finance AI", createdAt: "2024-12-05", lastUsed: "2025-01-09", tags: ["finance", "calculations", "accuracy"] },
];

const typeColors: Record<string, string> = {
  safety: "bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]",
  accuracy: "bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))]",
  fairness: "bg-[hsl(var(--tag-purple-bg))] text-[hsl(var(--tag-purple))]",
  custom: "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-2))]",
};

const formatColors: Record<string, string> = {
  JSONL: "bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))]",
  CSV: "bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]",
  Parquet: "bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]",
};

export default function Datasets() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = DATASETS.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.tags.some(t => t.includes(search.toLowerCase()))) return false;
    if (typeFilter !== "all" && d.type !== typeFilter) return false;
    return true;
  });

  const totalSamples = DATASETS.reduce((s, d) => s + d.samples, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[hsl(var(--s-in-bg))] rounded-lg"><Database size={20} className="text-[hsl(var(--s-in-tx))]" /></div>
          <div>
            <h1 className="text-xl font-bold text-[hsl(var(--text-1))]">Dataset Hub</h1>
            <p className="text-sm text-[hsl(var(--text-3))]">{DATASETS.length} evaluation datasets · {totalSamples.toLocaleString()} total samples</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-[hsl(var(--s-ok-tx))] hover:bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={14} /> Create Dataset
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search datasets or tags..." className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:ring-2 focus:ring-green-500 focus:border-[hsl(var(--s-ok-br))] outline-none" />
        </div>
        <div className="flex gap-2">
          {["all", "safety", "accuracy", "fairness", "custom"].map(f => (
            <button key={f} onClick={() => setTypeFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg capitalize font-medium transition-colors ${
              typeFilter === f ? "bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))]" : "bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] text-[hsl(var(--text-2))]"
            }`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Dataset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(d => (
          <Card key={d.id} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[hsl(var(--text-4))] flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{d.name}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${typeColors[d.type]}`}>{d.type}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${formatColors[d.format]}`}>{d.format}</span>
                </div>
              </div>
              <p className="text-xs text-[hsl(var(--text-3))] mb-3">{d.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {d.tags.map(t => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]">{t}</span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))]">
                <div className="flex items-center gap-4 text-[11px] text-[hsl(var(--text-3))]">
                  <span className="font-mono font-medium text-[hsl(var(--text-2))]">{d.samples.toLocaleString()} samples</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {d.lastUsed}</span>
                  <span>{d.createdBy}</span>
                </div>
                <button className="text-xs text-[hsl(var(--s-ok-tx))] hover:underline font-medium flex items-center gap-1">
                  Preview <ArrowUpRight size={10} />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
