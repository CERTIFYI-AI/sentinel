import { useState } from "react";
import { Wrench, Clock, CheckCircle2, AlertTriangle, ArrowRight, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface RemediationItem {
  id: string;
  title: string;
  framework: string;
  controlId: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "open" | "in-progress" | "blocked" | "completed" | "verified";
  assignee: string;
  dueDate: string;
  createdDate: string;
  description: string;
  progress: number;
}

const ITEMS: RemediationItem[] = [
  { id: "REM-001", title: "Implement automated model card generation", framework: "EU AI Act", controlId: "Art.13", priority: "high", status: "in-progress", assignee: "Alice Chen", dueDate: "2025-02-28", createdDate: "2025-01-05", description: "Deploy automated model card generation as part of CI/CD pipeline", progress: 65 },
  { id: "REM-002", title: "Complete risk management integration", framework: "EU AI Act", controlId: "Art.9", priority: "critical", status: "in-progress", assignee: "Bob Kim", dueDate: "2025-02-15", createdDate: "2025-01-03", description: "Integrate risk assessment into model registration workflow", progress: 40 },
  { id: "REM-003", title: "Deploy fairness metric suite", framework: "NIST AI RMF", controlId: "MEASURE-1", priority: "medium", status: "open", assignee: "Carol Davis", dueDate: "2025-03-01", createdDate: "2025-01-10", description: "Deploy custom fairness metrics in the Metric Studio evaluation pipeline", progress: 0 },
  { id: "REM-004", title: "Create risk response playbooks", framework: "NIST AI RMF", controlId: "MANAGE-3", priority: "high", status: "open", assignee: "Risk Team", dueDate: "2025-03-15", createdDate: "2025-01-08", description: "Create and test response playbooks for the top 10 identified AI risks", progress: 0 },
  { id: "REM-005", title: "Implement mandatory red-teaming", framework: "EU AI Act", controlId: "Art.15", priority: "medium", status: "blocked", assignee: "Security Team", dueDate: "2025-03-15", createdDate: "2025-01-06", description: "Standardize adversarial testing across all production models", progress: 20 },
  { id: "REM-006", title: "AI competence training program", framework: "ISO 42001", controlId: "7.2", priority: "high", status: "open", assignee: "HR", dueDate: "2025-04-01", createdDate: "2025-01-12", description: "Define AI competence requirements and launch team training program", progress: 0 },
  { id: "REM-007", title: "Data lineage tracking", framework: "EU AI Act", controlId: "Art.10", priority: "high", status: "in-progress", assignee: "Data Team", dueDate: "2025-03-01", createdDate: "2025-01-04", description: "Implement data lineage tracking across all training data pipelines", progress: 55 },
  { id: "REM-008", title: "Mandatory AIIA process", framework: "ISO 42001", controlId: "8.4", priority: "critical", status: "in-progress", assignee: "Ethics Board", dueDate: "2025-02-28", createdDate: "2025-01-02", description: "Implement AI Impact Assessment process before model deployment", progress: 30 },
];

const statusColors: Record<string, string> = {
  open: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  blocked: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  verified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  low: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
};

const progressColor = (p: number) => p >= 75 ? "bg-green-500" : p >= 40 ? "bg-blue-500" : p > 0 ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700";

export default function Remediation() {
  const [statusFilter, setStatusFilter] = useState("all");
  const filtered = statusFilter === "all" ? ITEMS : ITEMS.filter(i => i.status === statusFilter);

  const stats = {
    total: ITEMS.length,
    inProgress: ITEMS.filter(i => i.status === "in-progress").length,
    overdue: ITEMS.filter(i => i.status !== "completed" && i.status !== "verified" && new Date(i.dueDate) < new Date("2025-01-20")).length,
    critical: ITEMS.filter(i => i.priority === "critical" && i.status !== "completed").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-950 rounded-lg"><Wrench size={20} className="text-amber-600 dark:text-amber-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Remediation Tracker</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Track compliance gap remediation from identification to verification</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Items", value: stats.total, icon: Wrench, color: "text-slate-600 dark:text-slate-300" },
          { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-blue-600 dark:text-blue-400" },
          { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
          { label: "Critical Open", value: stats.critical, icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
        ].map((s, i) => (
          <Card key={i} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-slate-400" />
        {["all", "open", "in-progress", "blocked", "completed"].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg capitalize font-medium transition-colors ${
            statusFilter === f ? "bg-green-600 text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}>{f === "all" ? "All" : f.replace("-", " ")}</button>
        ))}
      </div>

      {/* Remediation List */}
      <div className="space-y-3">
        {filtered.map(item => (
          <Card key={item.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] text-slate-400">{item.id}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${priorityColors[item.priority]}`}>{item.priority}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${statusColors[item.status]}`}>{item.status.replace("-", " ")}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{item.framework} <ArrowRight size={10} className="inline" /> {item.controlId}</span>
                  <span>Assignee: <span className="font-medium text-slate-700 dark:text-slate-300">{item.assignee}</span></span>
                  <span>Due: <span className={`font-medium ${new Date(item.dueDate) < new Date("2025-01-20") && item.status !== "completed" ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>{item.dueDate}</span></span>
                </div>
                <div className="flex items-center gap-2 min-w-[140px]">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${progressColor(item.progress)}`} style={{ width: `${Math.max(item.progress, 2)}%` }} />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300 w-8 text-right">{item.progress}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
