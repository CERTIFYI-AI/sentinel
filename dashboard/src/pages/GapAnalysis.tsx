import { useState } from "react";
import { Target, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";

interface GapItem {
  controlId: string;
  controlName: string;
  framework: string;
  status: "covered" | "partial" | "gap" | "na";
  severity: "critical" | "high" | "medium" | "low";
  remediation: string;
  evidence: string;
}

const GAP_DATA: GapItem[] = [
  { controlId: "Art.9", controlName: "Risk Management System", framework: "EU AI Act", status: "covered", severity: "critical", remediation: "", evidence: "Trust scoring + HITL pipeline active" },
  { controlId: "Art.10", controlName: "Data Governance", framework: "EU AI Act", status: "covered", severity: "critical", remediation: "", evidence: "PII detection with Presidio" },
  { controlId: "Art.12", controlName: "Record-Keeping", framework: "EU AI Act", status: "covered", severity: "high", remediation: "", evidence: "SHA-256 hash chain audit log" },
  { controlId: "Art.13", controlName: "Transparency", framework: "EU AI Act", status: "partial", severity: "high", remediation: "Add model card disclosure endpoint", evidence: "Trust headers present but model cards missing" },
  { controlId: "Art.14", controlName: "Human Oversight", framework: "EU AI Act", status: "covered", severity: "critical", remediation: "", evidence: "HITL queue with L3 escalation" },
  { controlId: "Art.17", controlName: "Quality Management", framework: "EU AI Act", status: "partial", severity: "medium", remediation: "Add automated regression tests", evidence: "Drift detection active, no regression suite" },
  { controlId: "Art.35", controlName: "Data Protection Impact", framework: "GDPR", status: "gap", severity: "critical", remediation: "Implement DPIA template and workflow", evidence: "No DPIA process documented" },
  { controlId: "Art.25", controlName: "Data Protection by Design", framework: "GDPR", status: "covered", severity: "high", remediation: "", evidence: "PII masking by default" },
  { controlId: "A.6.1", controlName: "AI Risk Assessment", framework: "ISO 42001", status: "covered", severity: "high", remediation: "", evidence: "7-framework compliance engine" },
  { controlId: "A.6.2", controlName: "AI Impact Assessment", framework: "ISO 42001", status: "gap", severity: "high", remediation: "Create impact assessment template", evidence: "No formal impact assessment" },
  { controlId: "MAP-1.1", controlName: "Context Mapping", framework: "NIST AI RMF", status: "partial", severity: "medium", remediation: "Document deployment context", evidence: "Partial coverage via model inventory" },
  { controlId: "GOV-1.1", controlName: "Accountability", framework: "NIST AI RMF", status: "covered", severity: "high", remediation: "", evidence: "Audit trail with owner attribution" },
];

const statusIcon = (s: string) => {
  if (s === "covered") return <CheckCircle2 size={16} className="text-green-500" />;
  if (s === "partial") return <AlertTriangle size={16} className="text-amber-500" />;
  if (s === "gap") return <XCircle size={16} className="text-red-500" />;
  return <Minus size={16} className="text-zinc-500" />;
};

const statusBg = (s: string) => {
  if (s === "covered") return "bg-green-500/10 text-green-500 border-green-500/20";
  if (s === "partial") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  if (s === "gap") return "bg-red-500/10 text-red-500 border-red-500/20";
  return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
};

export default function GapAnalysis() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedFw, setExpandedFw] = useState<Set<string>>(new Set(["EU AI Act", "GDPR", "ISO 42001", "NIST AI RMF"]));

  const filtered = filterStatus === "all" ? GAP_DATA : GAP_DATA.filter(g => g.status === filterStatus);
  const frameworks = [...new Set(filtered.map(g => g.framework))];

  const covered = GAP_DATA.filter(g => g.status === "covered").length;
  const partial = GAP_DATA.filter(g => g.status === "partial").length;
  const gaps = GAP_DATA.filter(g => g.status === "gap").length;
  const total = GAP_DATA.length;
  const coveragePct = Math.round(((covered + partial * 0.5) / total) * 100);

  const toggleFw = (fw: string) => {
    const next = new Set(expandedFw);
    next.has(fw) ? next.delete(fw) : next.add(fw);
    setExpandedFw(next);
  };

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Target size={24} className="text-green-500" />
        <div>
          <h1 className="text-2xl font-bold">Gap Analysis</h1>
          <p className="text-sm text-muted-foreground">Compliance gap tracking across all frameworks</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{coveragePct}%</p>
          <p className="text-xs text-muted-foreground mt-1">Overall Coverage</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{covered}</p>
          <p className="text-xs text-muted-foreground mt-1">Covered</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{partial}</p>
          <p className="text-xs text-muted-foreground mt-1">Partial</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{gaps}</p>
          <p className="text-xs text-muted-foreground mt-1">Gaps</p>
        </CardContent></Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "covered", "partial", "gap"].map(f => (
          <button key={f} onClick={() => setFilterStatus(f)}
            className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${
              filterStatus === f ? "bg-green-600 text-white" : "border border-border text-muted-foreground hover:bg-muted"
            }`}>{f === "all" ? "All Controls" : f}</button>
        ))}
      </div>

      {/* Framework groups */}
      {frameworks.map(fw => {
        const items = filtered.filter(g => g.framework === fw);
        const isOpen = expandedFw.has(fw);
        return (
          <Card key={fw}>
            <button onClick={() => toggleFw(fw)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="font-medium text-sm">{fw}</span>
                <span className="text-xs text-muted-foreground">({items.length} controls)</span>
              </div>
              <div className="flex gap-2">
                {["covered", "partial", "gap"].map(s => {
                  const c = items.filter(i => i.status === s).length;
                  return c > 0 ? <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBg(s)}`}>{c} {s}</span> : null;
                })}
              </div>
            </button>
            {isOpen && (
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    {["Control", "Name", "Status", "Severity", "Evidence / Remediation"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {items.map(g => (
                      <tr key={g.controlId} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-mono text-xs">{g.controlId}</td>
                        <td className="px-4 py-2.5">{g.controlName}</td>
                        <td className="px-4 py-2.5"><span className="flex items-center gap-1.5">{statusIcon(g.status)}<span className="capitalize">{g.status}</span></span></td>
                        <td className="px-4 py-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                          g.severity === "critical" ? "bg-red-500/10 text-red-400" : g.severity === "high" ? "bg-amber-500/10 text-amber-400" : "bg-zinc-500/10 text-zinc-400"
                        }`}>{g.severity}</span></td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {g.status === "gap" || g.status === "partial" ? <span className="text-amber-400">{g.remediation}</span> : g.evidence}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
