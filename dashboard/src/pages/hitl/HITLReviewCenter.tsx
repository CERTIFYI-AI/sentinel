import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { AlertTriangle, Clock, CheckCircle2, Eye, Filter, Plus, TrendingUp, Brain, Scale, ShieldAlert } from "lucide-react";

const reviewItems = [
  { id: "HITL-001", model: "GPT-4 Turbo", type: "Bias Detection", trigger: "Fairness metric drop", priority: "critical", status: "pending", assignee: "Priya Singh", sla: "2h remaining", module: "Credit Scoring", riskScore: 94 },
  { id: "HITL-002", model: "CreditScorer v2", type: "Data Drift", trigger: "Input distribution shift > 15%", priority: "high", status: "in_review", assignee: "James O'Brien", sla: "5h remaining", module: "Loan Approval", riskScore: 78 },
  { id: "HITL-003", model: "HiringFilter AI", type: "Explainability", trigger: "LIME confidence < 0.6", priority: "high", status: "pending", assignee: "Sonia Patel", sla: "4h remaining", module: "Recruitment", riskScore: 82 },
  { id: "HITL-004", model: "FraudGuard v3", type: "Anomaly", trigger: "False positive rate spike", priority: "medium", status: "approved", assignee: "Carlos Mendez", sla: "Completed", module: "Fraud Detection", riskScore: 65 },
  { id: "HITL-005", model: "SentimentBot", type: "Ethical Review", trigger: "Content policy flag", priority: "medium", status: "in_review", assignee: "Amara Diallo", sla: "8h remaining", module: "Customer Support", riskScore: 71 },
  { id: "HITL-006", model: "PricingEngine", type: "Regulatory", trigger: "EU AI Act Article 6 check", priority: "critical", status: "escalated", assignee: "Elena Vasquez", sla: "Overdue", module: "Dynamic Pricing", riskScore: 91 },
  { id: "HITL-007", model: "ChurnPredictor", type: "Model Performance", trigger: "Accuracy drop below threshold", priority: "low", status: "approved", assignee: "David Kim", sla: "Completed", module: "CRM", riskScore: 45 },
  { id: "HITL-008", model: "GPT-4 Turbo", type: "Bias Detection", trigger: "Gender parity score < 0.8", priority: "high", status: "pending", assignee: "Priya Singh", sla: "1h remaining", module: "Hiring Filter", riskScore: 88 },
];

const priorityColor: Record<string,string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const statusColor: Record<string,string> = {
  pending: "bg-yellow-500/20 text-yellow-300",
  in_review: "bg-blue-500/20 text-blue-300",
  approved: "bg-emerald-500/20 text-emerald-300",
  escalated: "bg-red-500/20 text-red-300",
};

export default function HITLReviewCenter() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const pending = reviewItems.filter(r => r.status === "pending").length;
  const inReview = reviewItems.filter(r => r.status === "in_review").length;
  const escalated = reviewItems.filter(r => r.status === "escalated").length;
  const avgRisk = Math.round(reviewItems.reduce((a,r) => a + r.riskScore, 0) / reviewItems.length);

  const filtered = reviewItems.filter(r => {
    const matchSearch = r.model.toLowerCase().includes(search.toLowerCase()) ||
      r.type.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || r.status === filter || r.priority === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HITL Review Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Human-in-the-loop review queue for AI model decisions requiring oversight</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"><Filter className="h-4 w-4 mr-1" />Filter</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" />Add Review</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Pending Review</p><p className="text-3xl font-bold text-yellow-400">{pending}</p></div>
            <Clock className="h-8 w-8 text-yellow-400 opacity-70" />
          </div>
          <p className="text-xs text-yellow-400 mt-1">{pending} awaiting assignment</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">In Review</p><p className="text-3xl font-bold text-blue-400">{inReview}</p></div>
            <Eye className="h-8 w-8 text-blue-400 opacity-70" />
          </div>
          <p className="text-xs text-blue-400 mt-1">Active review sessions</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Escalated</p><p className="text-3xl font-bold text-red-400">{escalated}</p></div>
            <AlertTriangle className="h-8 w-8 text-red-400 opacity-70" />
          </div>
          <p className="text-xs text-red-400 mt-1">Require immediate attention</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Avg Risk Score</p><p className="text-3xl font-bold text-emerald-400">{avgRisk}</p></div>
            <TrendingUp className="h-8 w-8 text-emerald-400 opacity-70" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Across all active items</p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3">
        <Input placeholder="Search by model, type or ID..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        {["all", "pending", "in_review", "escalated", "critical", "high"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              filter === f ? "bg-emerald-600 text-white border-emerald-600" : "text-muted-foreground border-border hover:border-emerald-500"
            }`}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1).replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Review Queue Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Review Queue</h2>
          <span className="text-xs text-muted-foreground">{filtered.length} items</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              {["ID","Model","Type","Trigger","Priority","Status","Assignee","SLA","Risk","Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-b hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-emerald-400">{item.id}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{item.model}</p>
                      <p className="text-xs text-muted-foreground">{item.module}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {item.type === "Bias Detection" && <Scale className="h-3 w-3 text-orange-400" />}
                    {item.type === "Regulatory" && <ShieldAlert className="h-3 w-3 text-red-400" />}
                    <span className="text-xs">{item.type}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">{item.trigger}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${priorityColor[item.priority]}`}>
                    {item.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColor[item.status]}`}>
                    {item.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{item.assignee}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${item.sla === "Overdue" ? "text-red-400" : item.sla === "Completed" ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {item.sla}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.riskScore > 85 ? "bg-red-500" : item.riskScore > 70 ? "bg-orange-500" : "bg-emerald-500"}`}
                        style={{width: `${item.riskScore}%`}} />
                    </div>
                    <span className="text-xs font-mono">{item.riskScore}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/hitl/${item.id}`)}>Review</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
