
import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Search, Plus, AlertTriangle } from "lucide-react";

const mockRisks = [
  { id: "RSK-001", name: "Prompt Injection via Customer Input", category: "AI Security", likelihood: 4, impact: 5, score: 20, status: "open", owner: "Sarah Chen", targetDate: "2025-07-15" },
  { id: "RSK-002", name: "Unauthorized Model Access", category: "Access Control", likelihood: 3, impact: 4, score: 12, status: "mitigated", owner: "John Park", targetDate: "2025-06-30" },
  { id: "RSK-003", name: "Data Leakage in LLM Context", category: "Data Privacy", likelihood: 4, impact: 4, score: 16, status: "open", owner: "Emily Davis", targetDate: "2025-08-01" },
  { id: "RSK-004", name: "Model Hallucination in Production", category: "Operational", likelihood: 5, impact: 3, score: 15, status: "open", owner: "Mike Johnson", targetDate: "2025-07-20" },
  { id: "RSK-005", name: "Bias in Resume Screening Model", category: "Compliance", likelihood: 3, impact: 5, score: 15, status: "open", owner: "Lisa Wang", targetDate: "2025-08-15" },
  { id: "RSK-006", name: "Third-party API Key Exposure", category: "AI Security", likelihood: 2, impact: 5, score: 10, status: "mitigated", owner: "Tom Lee", targetDate: "2025-06-15" },
  { id: "RSK-007", name: "Training Data Poisoning", category: "AI Security", likelihood: 2, impact: 5, score: 10, status: "accepted", owner: "Sarah Chen", targetDate: "2025-09-01" },
  { id: "RSK-008", name: "Model Drift Detection Failure", category: "Operational", likelihood: 3, impact: 3, score: 9, status: "open", owner: "Mike Johnson", targetDate: "2025-07-30" },
  { id: "RSK-009", name: "GDPR Non-compliance in AI Processing", category: "Compliance", likelihood: 2, impact: 5, score: 10, status: "mitigated", owner: "Emily Davis", targetDate: "2025-06-20" },
  { id: "RSK-010", name: "Shadow AI Usage by Employees", category: "Operational", likelihood: 4, impact: 3, score: 12, status: "open", owner: "John Park", targetDate: "2025-07-10" },
  { id: "RSK-011", name: "Vendor Lock-in with OpenAI", category: "Operational", likelihood: 3, impact: 3, score: 9, status: "accepted", owner: "Lisa Wang", targetDate: "2025-10-01" },
  { id: "RSK-012", name: "Jailbreak Attack on Customer Bot", category: "AI Security", likelihood: 4, impact: 4, score: 16, status: "open", owner: "Tom Lee", targetDate: "2025-07-25" },
  { id: "RSK-013", name: "PII Exposure in Model Logs", category: "Data Privacy", likelihood: 3, impact: 4, score: 12, status: "open", owner: "Emily Davis", targetDate: "2025-08-10" },
  { id: "RSK-014", name: "Cost Overrun from Token Usage", category: "Operational", likelihood: 4, impact: 2, score: 8, status: "mitigated", owner: "Mike Johnson", targetDate: "2025-06-25" },
  { id: "RSK-015", name: "Intellectual Property Leakage via LLM", category: "Data Privacy", likelihood: 3, impact: 5, score: 15, status: "open", owner: "Sarah Chen", targetDate: "2025-08-20" },
  { id: "RSK-016", name: "Inadequate Model Documentation", category: "Compliance", likelihood: 4, impact: 2, score: 8, status: "open", owner: "Lisa Wang", targetDate: "2025-07-05" },
  { id: "RSK-017", name: "Single Point of Failure in AI Pipeline", category: "Operational", likelihood: 3, impact: 4, score: 12, status: "open", owner: "Tom Lee", targetDate: "2025-08-05" },
  { id: "RSK-018", name: "Toxic Output Generation", category: "AI Security", likelihood: 3, impact: 4, score: 12, status: "mitigated", owner: "Sarah Chen", targetDate: "2025-06-30" },
  { id: "RSK-019", name: "Regulatory Change Impact (EU AI Act)", category: "Compliance", likelihood: 5, impact: 4, score: 20, status: "open", owner: "Emily Davis", targetDate: "2025-09-15" },
  { id: "RSK-020", name: "Embedding Store Unauthorized Access", category: "Access Control", likelihood: 2, impact: 4, score: 8, status: "transferred", owner: "John Park", targetDate: "2025-07-01" },
];

const scoreColor = (s: number) => s >= 15 ? "text-red-400 bg-red-500/10" : s >= 10 ? "text-yellow-400 bg-yellow-500/10" : "text-green-400 bg-green-500/10";
const statusColor = (s: string) => ({ open: "bg-red-500/10 text-red-400 border-red-500/30", mitigated: "bg-green-500/10 text-green-400 border-green-500/30", accepted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", transferred: "bg-blue-500/10 text-blue-400 border-blue-500/30" })[s] || "";

export default function RiskRegister() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sel, setSel] = useState<typeof mockRisks[0] | null>(null);
  const filtered = mockRisks.filter(r => (catFilter === "all" || r.category === catFilter) && (r.name.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase())));
  const stats = { total: mockRisks.length, critical: mockRisks.filter(r => r.score >= 15).length, open: mockRisks.filter(r => r.status === "open").length, avgScore: Math.round(mockRisks.reduce((a,r) => a+r.score, 0)/mockRisks.length) };
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Risk Register</h1><p className="text-muted-foreground">Track and manage AI-related risks</p></div>
        <Button className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2" />Add Risk</Button></div>
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Risks</div><div className="text-3xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Critical (15+)</div><div className="text-3xl font-bold text-red-400">{stats.critical}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Open</div><div className="text-3xl font-bold text-yellow-400">{stats.open}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Avg Score</div><div className="text-3xl font-bold">{stats.avgScore}</div></CardContent></Card>
      </div>
      <div className="flex gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input placeholder="Search risks..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={catFilter} onValueChange={setCatFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Categories</SelectItem>{[...new Set(mockRisks.map(r => r.category))].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
      </div>
      <Card><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Risk Name</TableHead><TableHead>Category</TableHead><TableHead>L</TableHead><TableHead>I</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead><TableHead>Target</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map(r => (<TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={()=>setSel(r)}>
          <TableCell className="font-mono text-sm">{r.id}</TableCell><TableCell className="font-medium max-w-[250px]">{r.name}</TableCell><TableCell>{r.category}</TableCell>
          <TableCell>{r.likelihood}</TableCell><TableCell>{r.impact}</TableCell>
          <TableCell><span className={`px-2 py-1 rounded text-xs font-bold ${scoreColor(r.score)}`}>{r.score}</span></TableCell>
          <TableCell><span className={`px-2 py-1 rounded-full text-xs border ${statusColor(r.status)}`}>{r.status}</span></TableCell>
          <TableCell>{r.owner}</TableCell><TableCell>{r.targetDate}</TableCell></TableRow>))}</TableBody></Table></Card>
      <Dialog open={!!sel} onOpenChange={()=>setSel(null)}><DialogContent><DialogHeader><DialogTitle>{sel?.name}</DialogTitle></DialogHeader>
        {sel && <div className="space-y-3"><div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">ID:</span> {sel.id}</div><div><span className="text-muted-foreground">Category:</span> {sel.category}</div>
          <div><span className="text-muted-foreground">Likelihood:</span> {sel.likelihood}/5</div><div><span className="text-muted-foreground">Impact:</span> {sel.impact}/5</div>
          <div><span className="text-muted-foreground">Score:</span> <span className={`px-2 py-1 rounded text-xs font-bold ${scoreColor(sel.score)}`}>{sel.score}</span></div>
          <div><span className="text-muted-foreground">Status:</span> <span className={`px-2 py-1 rounded-full text-xs border ${statusColor(sel.status)}`}>{sel.status}</span></div>
          <div><span className="text-muted-foreground">Owner:</span> {sel.owner}</div><div><span className="text-muted-foreground">Target:</span> {sel.targetDate}</div>
        </div><div className="flex gap-2 pt-2"><Button size="sm" variant="outline">Edit</Button><Button size="sm" variant="outline">Mitigate</Button><Button size="sm" variant="destructive">Delete</Button></div></div>}
      </DialogContent></Dialog>
    </div>);
}
