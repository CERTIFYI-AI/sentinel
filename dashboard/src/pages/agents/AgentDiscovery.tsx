import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Rss, Shield, Search, AlertTriangle, Activity, Eye } from "lucide-react";

const agents = [
  { id: "AGT-001", name: "Customer Support Chatbot", type: "Conversational", model: "GPT-4-Turbo", owner: "Product Team", status: "active", risk: "medium", calls: 12400, lastSeen: "2026-03-29", tools: ["Knowledge Base", "Ticket API", "CRM Lookup"], description: "Handles tier-1 customer inquiries via web chat and email" },
  { id: "AGT-002", name: "Loan Underwriting Agent", type: "Decision", model: "CreditScorer v2.1", owner: "Risk Team", status: "active", risk: "high", calls: 3200, lastSeen: "2026-03-29", tools: ["Credit Bureau API", "Income Verification", "Fraud Detection"], description: "Automated loan decisioning for applications under $50K" },
  { id: "AGT-003", name: "Code Review Assistant", type: "Developer Tool", model: "Claude-3-Sonnet", owner: "Engineering", status: "active", risk: "low", calls: 8900, lastSeen: "2026-03-28", tools: ["GitHub API", "Static Analysis", "Documentation Search"], description: "Reviews pull requests and suggests improvements" },
  { id: "AGT-004", name: "Compliance Document Analyzer", type: "Document Processing", model: "GPT-4-Turbo", owner: "Legal", status: "active", risk: "high", calls: 1560, lastSeen: "2026-03-29", tools: ["Document Parser", "Regulation DB", "Citation Linker"], description: "Extracts compliance requirements from regulatory filings" },
  { id: "AGT-005", name: "Internal Knowledge Search", type: "RAG", model: "Llama-3-70B", owner: "IT Operations", status: "active", risk: "low", calls: 15200, lastSeen: "2026-03-29", tools: ["Vector Store", "Confluence API", "Slack Search"], description: "Enterprise knowledge retrieval across internal documentation" },
  { id: "AGT-006", name: "Fraud Alert Triage Bot", type: "Decision", model: "FraudDetector v3.0", owner: "Security", status: "active", risk: "critical", calls: 4800, lastSeen: "2026-03-29", tools: ["Transaction DB", "IP Geolocation", "Device Fingerprint"], description: "Real-time fraud alert classification and escalation" },
  { id: "AGT-007", name: "Marketing Content Generator", type: "Generative", model: "Claude-3-Sonnet", owner: "Marketing", status: "paused", risk: "medium", calls: 2100, lastSeen: "2026-03-25", tools: ["Brand Guide API", "Image Generator", "SEO Analyzer"], description: "Generates marketing copy and social media content" },
  { id: "AGT-008", name: "Shadow IT Scanner", type: "Discovery", model: "Custom Rule Engine", owner: "Security", status: "active", risk: "medium", calls: 890, lastSeen: "2026-03-29", tools: ["Network Scanner", "API Gateway Logs", "DNS Monitor"], description: "Detects unauthorized AI agent deployments across the network" },
  { id: "AGT-009", name: "HR Onboarding Assistant", type: "Conversational", model: "GPT-4-Turbo", owner: "HR", status: "retired", risk: "low", calls: 340, lastSeen: "2026-02-15", tools: ["HRIS API", "Policy DB", "Calendar API"], description: "Guided new employee onboarding and FAQ handling" },
  { id: "AGT-010", name: "Suspicious Activity Reporter", type: "Monitoring", model: "Gemini Pro", owner: "Compliance", status: "active", risk: "critical", calls: 6700, lastSeen: "2026-03-29", tools: ["Transaction Monitor", "AML Database", "Regulatory Filing API"], description: "Monitors transactions for suspicious activity and generates SARs" },
  { id: "AGT-011", name: "Data Pipeline Orchestrator", type: "Automation", model: "Llama-3-70B", owner: "Data Engineering", status: "active", risk: "medium", calls: 3400, lastSeen: "2026-03-28", tools: ["Airflow API", "Data Catalog", "Quality Checker"], description: "Manages ETL pipeline scheduling and error recovery" },
  { id: "AGT-012", name: "Vendor Risk Assessor", type: "Analysis", model: "GPT-4-Turbo", owner: "Procurement", status: "active", risk: "high", calls: 780, lastSeen: "2026-03-27", tools: ["Vendor DB", "SOC Report Parser", "Risk Scoring Engine"], description: "Evaluates third-party vendor security posture" },
];

const statsCards = [
  { label: "Total Agents", value: "12", icon: "Rss" },
  { label: "Active", value: "10", icon: "Shield" },
  { label: "Shadow AI", value: "3", icon: "AlertTriangle" },
  { label: "API Calls Today", value: "45.2K", icon: "Activity" },
];

const riskColors: Record<string, string> = { critical: "destructive", high: "destructive", medium: "default", low: "secondary" };
const statusColors: Record<string, string> = { active: "default", paused: "secondary", retired: "outline" };

export default function AgentDiscovery() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sel, setSel] = useState<typeof agents[0] | null>(null);

  const filtered = agents.filter((a) => {
    const matchSearch = JSON.stringify(a).toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === "all" || a.risk === riskFilter;
    return matchSearch && matchRisk;
  });

  const iconMap: Record<string, any> = { Rss, Shield, AlertTriangle, Activity };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Discovery</h1>
          <p className="text-muted-foreground">Monitor and govern all AI agents across the organization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Eye className="h-4 w-4 mr-2" />Scan Network</Button>
          <Button><Rss className="h-4 w-4 mr-2" />Register Agent</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statsCards.map((s) => {
          const Icon = iconMap[s.icon];
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
                {Icon && <Icon className="h-8 w-8 text-muted-foreground" />}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search agents by name, model, owner..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2">
              {["all", "critical", "high", "medium", "low"].map((r) => (
                <Button key={r} size="sm" variant={riskFilter === r ? "default" : "outline"} onClick={() => setRiskFilter(r)}>{r === "all" ? "All Risk" : r.charAt(0).toUpperCase() + r.slice(1)}</Button>
              ))}
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Agent Name</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Model</th>
                <th className="text-left p-3">Risk</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">API Calls</th>
                <th className="text-left p-3">Owner</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSel(a)}>
                  <td className="p-3 text-sm font-mono">{a.id}</td>
                  <td className="p-3 font-medium">{a.name}</td>
                  <td className="p-3 text-sm">{a.type}</td>
                  <td className="p-3 text-sm">{a.model}</td>
                  <td className="p-3"><Badge variant={riskColors[a.risk] as any}>{a.risk}</Badge></td>
                  <td className="p-3"><Badge variant={statusColors[a.status] as any}>{a.status}</Badge></td>
                  <td className="p-3 text-sm">{a.calls.toLocaleString()}</td>
                  <td className="p-3 text-sm">{a.owner}</td>
                  <td className="p-3"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSel(a); }}>View</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-muted-foreground mt-2">{filtered.length} of {agents.length} agents</p>
        </CardContent>
      </Card>

      <Dialog open={!!sel} onOpenChange={() => setSel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{sel?.name}</DialogTitle></DialogHeader>
          {sel && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{sel.description}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">ID:</span> {sel.id}</div>
                <div><span className="text-muted-foreground">Type:</span> {sel.type}</div>
                <div><span className="text-muted-foreground">Model:</span> {sel.model}</div>
                <div><span className="text-muted-foreground">Owner:</span> {sel.owner}</div>
                <div><span className="text-muted-foreground">Risk:</span> <Badge variant={riskColors[sel.risk] as any}>{sel.risk}</Badge></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColors[sel.status] as any}>{sel.status}</Badge></div>
                <div><span className="text-muted-foreground">API Calls:</span> {sel.calls.toLocaleString()}</div>
                <div><span className="text-muted-foreground">Last Seen:</span> {sel.lastSeen}</div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Connected Tools</p>
                <div className="flex flex-wrap gap-1">
                  {sel.tools.map((t) => (<Badge key={t} variant="outline">{t}</Badge>))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm">Audit Trail</Button>
                <Button size="sm" variant="outline">Edit</Button>
                <Button size="sm" variant="destructive">Disable</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
