import { useState } from "react";
import { Download, FileText, Clock, CheckCircle2, AlertTriangle, Play, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: "PDF" | "JSON" | "CSV" | "XLSX";
  category: string;
  lastGenerated: string;
  estimatedTime: string;
}

interface ExportJob {
  id: string;
  template: string;
  status: "queued" | "generating" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  size?: string;
  requestedBy: string;
}

const TEMPLATES: ExportTemplate[] = [
  { id: "t1", name: "Full Compliance Report", description: "Comprehensive report across all active frameworks with control status, evidence, and gap analysis", format: "PDF", category: "Compliance", lastGenerated: "2025-01-14", estimatedTime: "~30s" },
  { id: "t2", name: "EU AI Act Assessment", description: "Detailed EU AI Act compliance assessment including risk classification and transparency documentation", format: "PDF", category: "Compliance", lastGenerated: "2025-01-13", estimatedTime: "~20s" },
  { id: "t3", name: "Audit Trail Export", description: "Complete audit log with SHA-256 hash chain verification for the selected time period", format: "JSON", category: "Audit", lastGenerated: "2025-01-15", estimatedTime: "~10s" },
  { id: "t4", name: "Model Inventory Report", description: "All registered models with risk tiers, trust scores, and lifecycle status", format: "XLSX", category: "Models", lastGenerated: "2025-01-12", estimatedTime: "~5s" },
  { id: "t5", name: "Risk Register Export", description: "Full risk register with heatmap data, mitigation status, and trend analysis", format: "CSV", category: "Risk", lastGenerated: "2025-01-11", estimatedTime: "~5s" },
  { id: "t6", name: "Vendor Due Diligence Pack", description: "Third-party vendor compliance scores, certifications, and assessment history", format: "PDF", category: "Vendors", lastGenerated: "2025-01-10", estimatedTime: "~15s" },
  { id: "t7", name: "Incident Summary Report", description: "AI safety incidents summary with severity distribution and resolution metrics", format: "PDF", category: "Incidents", lastGenerated: "2025-01-09", estimatedTime: "~10s" },
  { id: "t8", name: "Benchmark Results Export", description: "Model benchmark scores across safety, accuracy, and fairness metrics", format: "JSON", category: "Benchmarks", lastGenerated: "2025-01-08", estimatedTime: "~5s" },
];

const RECENT_JOBS: ExportJob[] = [
  { id: "EXP-001", template: "Full Compliance Report", status: "completed", startedAt: "2025-01-15 14:30", completedAt: "2025-01-15 14:31", size: "2.4 MB", requestedBy: "Admin" },
  { id: "EXP-002", template: "Audit Trail Export", status: "completed", startedAt: "2025-01-15 10:15", completedAt: "2025-01-15 10:15", size: "8.1 MB", requestedBy: "Compliance" },
  { id: "EXP-003", template: "EU AI Act Assessment", status: "generating", startedAt: "2025-01-15 15:00", requestedBy: "Legal" },
  { id: "EXP-004", template: "Risk Register Export", status: "failed", startedAt: "2025-01-14 16:45", requestedBy: "Risk Team" },
];

const formatColors: Record<string, string> = {
  PDF: "bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]",
  JSON: "bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))]",
  CSV: "bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]",
  XLSX: "bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]",
};

const jobStatusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  queued: { color: "text-[hsl(var(--text-3))]", icon: Clock },
  generating: { color: "text-[hsl(var(--s-in-tx))]", icon: Play },
  completed: { color: "text-[hsl(var(--s-ok-tx))]", icon: CheckCircle2 },
  failed: { color: "text-[hsl(var(--s-er-tx))]", icon: AlertTriangle },
};

export default function ExportCenter() {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = (id: string) => {
    setGenerating(id);
    setTimeout(() => setGenerating(null), 2000);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Export Center"
        subtitle="Generate compliance reports, audit exports, and regulatory documentation"
        icon={Download}
      />

      {/* Recent Jobs */}
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2"><Clock size={14} /> Recent Exports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {RECENT_JOBS.map(job => {
              const sc = jobStatusConfig[job.status];
              const Icon = sc.icon;
              return (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--bg-muted))]">
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={sc.color} />
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--text-1))]">{job.template}</p>
                      <p className="text-[11px] text-[hsl(var(--text-3))]">{job.startedAt} · {job.requestedBy}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.size && <span className="text-xs text-[hsl(var(--text-3))]">{job.size}</span>}
                    <span className={`text-[10px] font-medium capitalize ${sc.color}`}>{job.status}</span>
                    {job.status === "completed" && (
                      <button className="text-xs text-[hsl(var(--s-ok-tx))] hover:underline font-medium">Download</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Export Templates */}
      <div>
        <h2 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">Export Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEMPLATES.map(t => (
            <Card key={t.id} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-[hsl(var(--text-4))] flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] dark:text-[hsl(var(--bg-surface))]">{t.name}</h3>
                      <p className="text-[11px] text-[hsl(var(--text-3))] mt-0.5">{t.description}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex-shrink-0 ${formatColors[t.format]}`}>{t.format}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[hsl(var(--border))]">
                  <div className="flex items-center gap-3 text-[11px] text-[hsl(var(--text-3))]">
                    <span className="flex items-center gap-1"><Calendar size={10} /> Last: {t.lastGenerated}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {t.estimatedTime}</span>
                  </div>
                  <button
                    onClick={() => handleGenerate(t.id)}
                    disabled={generating === t.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[hsl(var(--s-ok-tx))] hover:bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] rounded-lg transition-colors disabled:opacity-50"
                  >
                    {generating === t.id ? (
                      <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                    ) : (
                      <><Download size={12} /> Generate</>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
