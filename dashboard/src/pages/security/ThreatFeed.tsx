import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import Badge from "@/components/ui/Badge";

type Severity = "critical" | "high" | "medium" | "low";
const SEV_MAP: Record<Severity, { variant: string; color: string }> = {
  critical: { variant: "critical", color: "bg-red-500" },
  high: { variant: "degraded", color: "bg-orange-500" },
  medium: { variant: "regen", color: "bg-amber-500" },
  low: { variant: "healthy", color: "bg-green-500" },
};

const THREATS = [
  { id: "CVE-2025-3001", title: "Prompt injection via multi-turn context poisoning", severity: "critical" as Severity, source: "OWASP LLM", published: "2025-07-01", affects: ["GPT-4o", "Claude 3.5"], mitigated: false },
  { id: "CVE-2025-2887", title: "Model weight exfiltration through gradient leakage", severity: "high" as Severity, source: "NIST AI RMF", published: "2025-06-28", affects: ["Llama 3.1"], mitigated: true },
  { id: "CVE-2025-2756", title: "Agentic tool-use escalation via function-call spoofing", severity: "critical" as Severity, source: "MITRE ATLAS", published: "2025-06-25", affects: ["Mistral Large", "GPT-4o"], mitigated: false },
  { id: "CVE-2025-2650", title: "Data poisoning in fine-tuning pipeline", severity: "medium" as Severity, source: "OWASP LLM", published: "2025-06-22", affects: ["Custom Models"], mitigated: true },
  { id: "CVE-2025-2544", title: "Jailbreak via Unicode homoglyph substitution", severity: "high" as Severity, source: "HuggingFace", published: "2025-06-20", affects: ["Claude 3.5", "Llama 3.1"], mitigated: false },
  { id: "CVE-2025-2411", title: "RAG retrieval poisoning through adversarial documents", severity: "medium" as Severity, source: "NIST AI RMF", published: "2025-06-18", affects: ["All RAG deployments"], mitigated: true },
  { id: "CVE-2025-2300", title: "System prompt extraction via token probability analysis", severity: "low" as Severity, source: "OWASP LLM", published: "2025-06-15", affects: ["GPT-4o"], mitigated: true },
];

export default function ThreatFeed() {
  const [filter, setFilter] = useState<Severity | "all">("all");
  const filtered = filter === "all" ? THREATS : THREATS.filter((t) => t.severity === filter);

  return (
    <PageWrapper title="Threat Feed" subtitle="Real-time AI security advisories, CVEs, and threat intelligence">
      <div className="flex gap-2 mb-4">
        {(["all", "critical", "high", "medium", "low"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            filter === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}>{s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${SEV_MAP[t.severity].color}`} />
                  <span className="text-xs font-mono text-slate-500">{t.id}</span>
                  <Badge variant={SEV_MAP[t.severity].variant as any} className="text-xs">{t.severity}</Badge>
                </div>
                <h4 className="text-sm font-semibold text-slate-900">{t.title}</h4>
              </div>
              {t.mitigated ? (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">Mitigated</span>
              ) : (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-medium">Open</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Source: {t.source}</span>
              <span>Published: {t.published}</span>
              <span>Affects: {t.affects.join(", ")}</span>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
