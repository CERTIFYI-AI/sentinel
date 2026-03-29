import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Search, Plus } from "lucide-react";
const sc = (s: string): string => ({ critical: "bg-red-500/10 text-red-400", high: "bg-orange-500/10 text-orange-400", medium: "bg-yellow-500/10 text-yellow-400", low: "bg-green-500/10 text-green-400", active: "bg-green-500/10 text-green-400", passing: "bg-green-500/10 text-green-400", pass: "bg-green-500/10 text-green-400", production: "bg-green-500/10 text-green-400", success: "bg-green-500/10 text-green-400", verified: "bg-green-500/10 text-green-400", compliant: "bg-green-500/10 text-green-400", resolved: "bg-green-500/10 text-green-400", closed: "bg-green-500/10 text-green-400", enabled: "bg-green-500/10 text-green-400", approved: "bg-green-500/10 text-green-400", warning: "bg-yellow-500/10 text-yellow-400", review: "bg-yellow-500/10 text-yellow-400", pending: "bg-yellow-500/10 text-yellow-400", investigating: "bg-yellow-500/10 text-yellow-400", "in-progress": "bg-yellow-500/10 text-yellow-400", flagged: "bg-yellow-500/10 text-yellow-400", staging: "bg-yellow-500/10 text-yellow-400", draft: "bg-yellow-500/10 text-yellow-400", partial: "bg-yellow-500/10 text-yellow-400", open: "bg-red-500/10 text-red-400", failing: "bg-red-500/10 text-red-400", fail: "bg-red-500/10 text-red-400", inactive: "bg-gray-500/10 text-gray-400", deprecated: "bg-gray-500/10 text-gray-400", retired: "bg-gray-500/10 text-gray-400", disabled: "bg-gray-500/10 text-gray-400", expired: "bg-red-500/10 text-red-400" } as Record<string, string>)[s] || "bg-blue-500/10 text-blue-400";
const mockData = [
  { id: "AGT-001", name: "CustomerServiceBot", type: "LLM Agent", endpoint: "https://api.example.com/agent/cs", status: "active", tools: "search,email,crm", reqDay: 2450, riskScore: 35, firstSeen: "2026-01-15" },
  { id: "AGT-002", name: "FraudDetectorAgent", type: "Decision Agent", endpoint: "https://api.example.com/agent/fraud", status: "active", tools: "db_query,alert", reqDay: 8200, riskScore: 72, firstSeen: "2026-01-20" },
  { id: "AGT-003", name: "ResumeScreener", type: "LLM Agent", endpoint: "https://api.example.com/agent/hr", status: "flagged", tools: "vector_search,score", reqDay: 340, riskScore: 88, firstSeen: "2026-02-01" },
  { id: "AGT-004", name: "CodeReviewBot", type: "LLM Agent", endpoint: "https://api.example.com/agent/code", status: "active", tools: "github_api,linter", reqDay: 1200, riskScore: 28, firstSeen: "2026-02-10" },
  { id: "AGT-005", name: "DataSummaryAgent", type: "RAG Agent", endpoint: "https://api.example.com/agent/data", status: "inactive", tools: "vector_search,summarize", reqDay: 0, riskScore: 15, firstSeen: "2026-02-15" },
  { id: "AGT-006", name: "ComplianceChecker", type: "Rule Engine", endpoint: "https://api.example.com/agent/comp", status: "active", tools: "policy_db,audit_log", reqDay: 550, riskScore: 45, firstSeen: "2026-03-01" },
  { id: "AGT-007", name: "PricingOptimizer", type: "ML Agent", endpoint: "https://api.example.com/agent/price", status: "flagged", tools: "market_data,db", reqDay: 3100, riskScore: 67, firstSeen: "2026-03-05" },
  { id: "AGT-008", name: "SupportEmailBot", type: "LLM Agent", endpoint: "https://api.example.com/agent/email", status: "active", tools: "email,crm,search", reqDay: 890, riskScore: 22, firstSeen: "2026-03-10" },
  { id: "AGT-009", name: "InvoiceParser", type: "Vision Agent", endpoint: "https://api.example.com/agent/invoice", status: "active", tools: "ocr,db_write", reqDay: 420, riskScore: 18, firstSeen: "2026-03-12" },
  { id: "AGT-010", name: "ThreatIntelAgent", type: "Security Agent", endpoint: "https://api.example.com/agent/threat", status: "active", tools: "threat_db,alert,siem", reqDay: 12000, riskScore: 55, firstSeen: "2026-03-15" },
  { id: "AGT-011", name: "ShadowChatBot", type: "Unknown", endpoint: "unknown", status: "flagged", tools: "unknown", reqDay: 78, riskScore: 95, firstSeen: "2026-03-20" },
  { id: "AGT-012", name: "ContentModerator", type: "LLM Agent", endpoint: "https://api.example.com/agent/mod", status: "active", tools: "classify,flag,db", reqDay: 5600, riskScore: 30, firstSeen: "2026-03-18" },
];
export default function AgentDiscovery() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const filtered = mockData.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Agent Discovery</h1><Badge className="bg-orange-500/10 text-orange-400">12 agents found</Badge></div>
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold">12</div><div className="text-xs text-muted-foreground">Total Agents</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-400">8</div><div className="text-xs text-muted-foreground">Active</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-400">3</div><div className="text-xs text-muted-foreground">Flagged</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-yellow-400">2</div><div className="text-xs text-muted-foreground">High Risk</div></CardContent></Card>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search agents..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Card className="border-border/50"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Tools</TableHead><TableHead>Req/Day</TableHead><TableHead>Risk Score</TableHead><TableHead>First Seen</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map(r => (<TableRow key={r.id} className={`cursor-pointer hover:bg-muted/50 ${r.status === "flagged" ? "bg-red-500/5" : ""}`} onClick={() => setSelected(r)}><TableCell className="font-mono text-sm">{r.id}</TableCell><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.type}</TableCell><TableCell><Badge className={sc(r.status)}>{r.status}</Badge></TableCell><TableCell className="text-xs text-muted-foreground">{r.tools}</TableCell><TableCell>{r.reqDay.toLocaleString()}</TableCell><TableCell><Badge className={r.riskScore >= 70 ? "bg-red-500/10 text-red-400" : r.riskScore >= 40 ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400"}>{r.riskScore}</Badge></TableCell><TableCell>{r.firstSeen}</TableCell></TableRow>))}</TableBody></Table></Card>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}><DialogContent><DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>{selected && <div className="space-y-2 text-sm">{Object.entries(selected).map(([k, v]) => <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>)}<div className="flex gap-2 pt-2"><Button size="sm" variant="outline">Inspect</Button><Button size="sm" variant="destructive">Flag</Button></div></div>}</DialogContent></Dialog>
    </div>
  );
}
