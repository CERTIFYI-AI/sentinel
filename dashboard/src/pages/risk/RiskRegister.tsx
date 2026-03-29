import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Search, Plus } from "lucide-react";

const mockRisks = [
  { id: "RSK-001", name: "Model hallucination in production", category: "AI Security", likelihood: 4, impact: 5, score: 20, status: "open", owner: "Alice Chen", target: "2026-04-15" },
  { id: "RSK-002", name: "PII leakage via prompt injection", category: "Data Privacy", likelihood: 3, impact: 5, score: 15, status: "mitigated", owner: "Bob Kumar", target: "2026-03-30" },
  { id: "RSK-003", name: "Biased hiring recommendations", category: "Compliance", likelihood: 3, impact: 4, score: 12, status: "open", owner: "Carol Davis", target: "2026-05-01" },
  { id: "RSK-004", name: "API key exposure in logs", category: "AI Security", likelihood: 2, impact: 4, score: 8, status: "mitigated", owner: "Dave Wilson", target: "2026-03-20" },
  { id: "RSK-005", name: "Model drift undetected", category: "Operational", likelihood: 3, impact: 3, score: 9, status: "open", owner: "Eve Sharma", target: "2026-04-10" },
  { id: "RSK-006", name: "Vendor lock-in risk", category: "Operational", likelihood: 4, impact: 3, score: 12, status: "accepted", owner: "Frank Li", target: "2026-06-01" },
  { id: "RSK-007", name: "Data poisoning attack", category: "AI Security", likelihood: 2, impact: 5, score: 10, status: "open", owner: "Grace Kim", target: "2026-04-20" },
  { id: "RSK-008", name: "GDPR training data issue", category: "Compliance", likelihood: 3, impact: 4, score: 12, status: "open", owner: "Henry Zhang", target: "2026-04-05" },
  { id: "RSK-009", name: "Shadow AI usage", category: "Operational", likelihood: 5, impact: 3, score: 15, status: "open", owner: "Iris Patel", target: "2026-03-31" },
  { id: "RSK-010", name: "Poor model documentation", category: "Compliance", likelihood: 4, impact: 2, score: 8, status: "open", owner: "Jack Brown", target: "2026-04-25" },
  { id: "RSK-011", name: "Jailbreak vulnerability", category: "AI Security", likelihood: 4, impact: 4, score: 16, status: "open", owner: "Karen Lee", target: "2026-04-01" },
  { id: "RSK-012", name: "Insufficient audit trail", category: "Compliance", likelihood: 3, impact: 3, score: 9, status: "mitigated", owner: "Leo Martinez", target: "2026-03-25" },
  { id: "RSK-013", name: "Token cost overrun", category: "Operational", likelihood: 3, impact: 2, score: 6, status: "accepted", owner: "Mia Johnson", target: "2026-05-15" },
  { id: "RSK-014", name: "Model output toxicity", category: "AI Security", likelihood: 3, impact: 4, score: 12, status: "open", owner: "Noah Williams", target: "2026-04-12" },
  { id: "RSK-015", name: "Cross-tenant data leakage", category: "Data Privacy", likelihood: 2, impact: 5, score: 10, status: "open", owner: "Olivia Taylor", target: "2026-04-18" },
  { id: "RSK-016", name: "Regulatory change impact", category: "Compliance", likelihood: 4, impact: 3, score: 12, status: "open", owner: "Peter Adams", target: "2026-05-01" },
  { id: "RSK-017", name: "Supply chain AI risk", category: "Operational", likelihood: 2, impact: 3, score: 6, status: "transferred", owner: "Quinn Roberts", target: "2026-05-10" },
  { id: "RSK-018", name: "Embedding model vulnerability", category: "AI Security", likelihood: 2, impact: 3, score: 6, status: "open", owner: "Rachel Green", target: "2026-04-30" },
  { id: "RSK-019", name: "Consent management gap", category: "Data Privacy", likelihood: 3, impact: 4, score: 12, status: "open", owner: "Sam Harris", target: "2026-04-08" },
  { id: "RSK-020", name: "Disaster recovery gap", category: "Operational", likelihood: 2, impact: 5, score: 10, status: "open", owner: "Tina Walker", target: "2026-04-22" },
];

const scoreColor = (s: number) => s >= 15 ? "bg-red-500/10 text-red-400" : s >= 9 ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400";
const statusColor = (s: string) => ({ open: "bg-red-500/10 text-red-400", mitigated: "bg-green-500/10 text-green-400", accepted: "bg-blue-500/10 text-blue-400", transferred: "bg-purple-500/10 text-purple-400" }[s] || "bg-gray-500/10 text-gray-400");

export default function RiskRegister() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const filtered = mockRisks.filter(r => (r.name.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase())) && (catFilter === "all" || r.category === catFilter));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Risk Register</h1><Button className="bg-green-600 hover:bg-green-700"><Plus className="h-4 w-4 mr-2" />Add Risk</Button></div>
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{mockRisks.length}</div><div className="text-xs text-muted-foreground">Total Risks</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-400">{mockRisks.filter(r=>r.score>=15).length}</div><div className="text-xs text-muted-foreground">Critical</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-yellow-400">{mockRisks.filter(r=>r.score>=9&&r.score<15).length}</div><div className="text-xs text-muted-foreground">Medium</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-400">{mockRisks.filter(r=>r.score<9).length}</div><div className="text-xs text-muted-foreground">Low</div></CardContent></Card>
      </div>
      <div className="flex gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search risks..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={catFilter} onValueChange={setCatFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem><SelectItem value="AI Security">AI Security</SelectItem><SelectItem value="Data Privacy">Data Privacy</SelectItem><SelectItem value="Compliance">Compliance</SelectItem><SelectItem value="Operational">Operational</SelectItem></SelectContent></Select></div>
      <Card className="border-border/50"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Risk Name</TableHead><TableHead>Category</TableHead><TableHead>L</TableHead><TableHead>I</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead><TableHead>Target</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map(r => (<TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}><TableCell className="font-mono text-sm">{r.id}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.category}</TableCell><TableCell>{r.likelihood}</TableCell><TableCell>{r.impact}</TableCell><TableCell><Badge className={scoreColor(r.score)}>{r.score}</Badge></TableCell><TableCell><Badge className={statusColor(r.status)}>{r.status}</Badge></TableCell><TableCell>{r.owner}</TableCell><TableCell>{r.target}</TableCell></TableRow>))}</TableBody></Table></Card>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}><DialogContent><DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>{selected && <div className="space-y-2 text-sm"><div>ID: {selected.id}</div><div>Category: {selected.category}</div><div>Score: {selected.score} (L:{selected.likelihood} x I:{selected.impact})</div><div>Status: <Badge className={statusColor(selected.status)}>{selected.status}</Badge></div><div>Owner: {selected.owner}</div><div>Target: {selected.target}</div><div className="flex gap-2 pt-2"><Button size="sm" variant="outline">Edit</Button><Button size="sm" variant="destructive">Delete</Button></div></div>}</DialogContent></Dialog>
    </div>
  );
}
