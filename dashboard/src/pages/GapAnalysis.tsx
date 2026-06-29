import { useState } from "react";
import { Target, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface Control {
  id: string;
  title: string;
  status: "met" | "partial" | "not-met" | "not-applicable";
  gap: string;
  remediation: string;
  priority: "critical" | "high" | "medium" | "low";
  dueDate: string;
  owner: string;
}

interface FrameworkGap {
  framework: string;
  flag: string;
  overallScore: number;
  controls: Control[];
}

const FRAMEWORKS: FrameworkGap[] = [
  {
    framework: "EU AI Act", flag: "🇪🇺", overallScore: 74,
    controls: [
      { id: "Art.6", title: "Classification as high-risk AI system", status: "met", gap: "", remediation: "", priority: "critical", dueDate: "2025-02-01", owner: "Legal" },
      { id: "Art.9", title: "Risk management system", status: "partial", gap: "Risk management process documented but not yet formally integrated into ML lifecycle", remediation: "Integrate risk assessment into model registration workflow", priority: "critical", dueDate: "2025-02-15", owner: "Risk Team" },
      { id: "Art.10", title: "Data governance requirements", status: "partial", gap: "Data quality metrics tracked but lineage documentation incomplete", remediation: "Implement data lineage tracking across all training pipelines", priority: "high", dueDate: "2025-03-01", owner: "Data Team" },
      { id: "Art.13", title: "Transparency obligations", status: "not-met", gap: "No standardized model card generation process", remediation: "Deploy automated model card generation as part of CI/CD", priority: "high", dueDate: "2025-02-28", owner: "ML Platform" },
      { id: "Art.14", title: "Human oversight provisions", status: "met", gap: "", remediation: "", priority: "critical", dueDate: "", owner: "Trust & Safety" },
      { id: "Art.15", title: "Accuracy, robustness, cybersecurity", status: "partial", gap: "Adversarial testing not standardized across all models", remediation: "Implement mandatory red-teaming before production deployment", priority: "medium", dueDate: "2025-03-15", owner: "Security" },
    ],
  },
  {
    framework: "NIST AI RMF", flag: "🇺🇸", overallScore: 68,
    controls: [
      { id: "GOVERN-1", title: "Policies, processes, procedures are in place", status: "met", gap: "", remediation: "", priority: "high", dueDate: "", owner: "Governance" },
      { id: "MAP-1", title: "Context is established and understood", status: "partial", gap: "Stakeholder impact assessments incomplete for 3 high-risk models", remediation: "Complete impact assessments for GPT-4o, Claude 3.5, internal classifier", priority: "high", dueDate: "2025-02-20", owner: "Product" },
      { id: "MEASURE-1", title: "Appropriate methods and metrics identified", status: "partial", gap: "Custom fairness metrics not yet integrated into eval pipeline", remediation: "Deploy fairness metric suite in Metric Studio", priority: "medium", dueDate: "2025-03-01", owner: "ML Platform" },
      { id: "MANAGE-1", title: "AI risks based on assessments are prioritized", status: "not-met", gap: "Risk prioritization framework not formally adopted", remediation: "Implement risk scoring in Risk Matrix module", priority: "critical", dueDate: "2025-02-10", owner: "Risk Team" },
      { id: "MANAGE-3", title: "Responses to identified AI risks are developed", status: "not-met", gap: "No formal risk response playbooks", remediation: "Create and test response playbooks for top 10 identified risks", priority: "high", dueDate: "2025-03-15", owner: "Risk Team" },
    ],
  },
  {
    framework: "ISO 42001", flag: "🌐", overallScore: 61,
    controls: [
      { id: "4.1", title: "Understanding the organization context", status: "met", gap: "", remediation: "", priority: "medium", dueDate: "", owner: "Compliance" },
      { id: "5.2", title: "AI policy established", status: "met", gap: "", remediation: "", priority: "high", dueDate: "", owner: "Compliance" },
      { id: "6.1", title: "Actions to address risks and opportunities", status: "partial", gap: "Opportunity assessment not yet included in risk process", remediation: "Extend risk framework to include opportunity identification", priority: "medium", dueDate: "2025-03-15", owner: "Risk Team" },
      { id: "7.2", title: "Competence requirements established", status: "not-met", gap: "No formal AI competence matrix or training program", remediation: "Define competence requirements and launch training program", priority: "high", dueDate: "2025-04-01", owner: "HR" },
      { id: "8.4", title: "AI system impact assessment", status: "not-met", gap: "Impact assessments not systematically conducted", remediation: "Implement mandatory AIIA process before model deployment", priority: "critical", dueDate: "2025-02-28", owner: "Ethics Board" },
      { id: "9.1", title: "Monitoring, measurement, analysis", status: "partial", gap: "Monitoring covers trust scores but not all AIMS KPIs", remediation: "Extend monitoring dashboard to cover all ISO 42001 KPIs", priority: "medium", dueDate: "2025-03-31", owner: "ML Platform" },
    ],
  },
];

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
  met: { color: "text-green-700 dark:text-green-400", bg: "bg-green-100 dark:bg-green-950", icon: CheckCircle2, label: "Met" },
  partial: { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950", icon: Clock, label: "Partial" },
  "not-met": { color: "text-red-700 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950", icon: XCircle, label: "Not Met" },
  "not-applicable": { color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800", icon: Target, label: "N/A" },
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  low: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
};

const scoreColor = (s: number) => s >= 85 ? "text-green-600 dark:text-green-400" : s >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
const barColor = (s: number) => s >= 85 ? "bg-green-500" : s >= 70 ? "bg-amber-500" : "bg-red-500";

export default function GapAnalysis() {
  const [expandedFw, setExpandedFw] = useState<string>(FRAMEWORKS[0].framework);

  const totalControls = FRAMEWORKS.reduce((s, f) => s + f.controls.length, 0);
  const metControls = FRAMEWORKS.reduce((s, f) => s + f.controls.filter(c => c.status === "met").length, 0);
  const notMetControls = FRAMEWORKS.reduce((s, f) => s + f.controls.filter(c => c.status === "not-met").length, 0);
  const criticalGaps = FRAMEWORKS.reduce((s, f) => s + f.controls.filter(c => c.status !== "met" && c.priority === "critical").length, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg"><Target size={20} className="text-orange-600 dark:text-orange-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Gap Analysis</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Identify compliance gaps across active frameworks with remediation tracking</p>
          </div>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Export Gap Report</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Controls", value: totalControls, sub: "Across all frameworks" },
          { label: "Controls Met", value: metControls, sub: `${Math.round(metControls / totalControls * 100)}% compliance` },
          { label: "Not Met", value: notMetControls, sub: "Require remediation" },
          { label: "Critical Gaps", value: criticalGaps, sub: "Immediate attention" },
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

      {/* Framework Accordion */}
      <div className="space-y-3">
        {FRAMEWORKS.map(fw => {
          const isExpanded = expandedFw === fw.framework;
          const met = fw.controls.filter(c => c.status === "met").length;
          const gaps = fw.controls.filter(c => c.status !== "met" && c.status !== "not-applicable");
          return (
            <Card key={fw.framework} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <button onClick={() => setExpandedFw(isExpanded ? "" : fw.framework)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-t-xl">
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  <span className="text-lg">{fw.flag}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{fw.framework}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{met}/{fw.controls.length} controls met · {gaps.length} gaps identified</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${barColor(fw.overallScore)} transition-all`} style={{ width: `${fw.overallScore}%` }} />
                    </div>
                  </div>
                  <span className={`text-lg font-bold font-mono ${scoreColor(fw.overallScore)}`}>{fw.overallScore}%</span>
                </div>
              </button>
              {isExpanded && (
                <CardContent className="px-5 pb-4 pt-0">
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <th className="text-left pb-2 font-semibold">Control</th>
                          <th className="text-left pb-2 font-semibold">Status</th>
                          <th className="text-left pb-2 font-semibold">Gap</th>
                          <th className="text-left pb-2 font-semibold">Priority</th>
                          <th className="text-left pb-2 font-semibold">Owner</th>
                          <th className="text-left pb-2 font-semibold">Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {fw.controls.map(c => {
                          const sc = statusConfig[c.status];
                          const Icon = sc.icon;
                          return (
                            <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="py-2.5 pr-3">
                                <span className="font-mono text-[11px] text-slate-400">{c.id}</span>
                                <p className="text-xs text-slate-800 dark:text-slate-200">{c.title}</p>
                              </td>
                              <td className="py-2.5 pr-3">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded ${sc.bg} ${sc.color}`}>
                                  <Icon size={10} /> {sc.label}
                                </span>
                              </td>
                              <td className="py-2.5 pr-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs">{c.gap || "—"}</td>
                              <td className="py-2.5 pr-3">{c.status !== "met" && <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${priorityColors[c.priority]}`}>{c.priority}</span>}</td>
                              <td className="py-2.5 pr-3 text-xs text-slate-600 dark:text-slate-300">{c.owner}</td>
                              <td className="py-2.5 text-xs text-slate-400">{c.dueDate || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
