import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Search, Plus } from "lucide-react";

const mockData = [
  { id: "INC-001", title: "GPT-4 hallucination in customer chat", severity: "critical", type: "hallucination", status: "resolved", reporter: "Alice Chen", date: "2026-03-15", mttr: "2h" },
  { id: "INC-002", title: "PII detected in model output", severity: "high", type: "data breach", status: "investigating", reporter: "Bob Kumar", date: "2026-03-18", mttr: "ongoing" },
  { id: "INC-003", title: "Bias detected in resume screener", severity: "high", type: "bias", status: "open", reporter: "Carol Davis", date: "2026-03-20", mttr: "ongoing" },
  { id: "INC-004", title: "Model API timeout spike", severity: "medium", type: "model failure", status: "resolved", reporter: "Dave Wilson", date: "2026-03-10", mttr: "45m" },
  { id: "INC-005", title: "Jailbreak attempt detected", severity: "high", type: "data breach", status: "resolved", reporter: "Eve Sharma", date: "2026-03-12", mttr: "1h" },
  { id: "INC-006", title: "Cost overrun Claude-3", severity: "medium", type: "model failure", status: "resolved", reporter: "Frank Li", date: "2026-03-08", mttr: "3h" },
  { id: "INC-007", title: "Unauthorized model deploy", severity: "critical", type: "model failure", status: "resolved", reporter: "Grace Kim", date: "2026-03-05", mttr: "6h" },
  { id: "INC-008", title: "Toxicity spike", severity: "high", type: "hallucination", status: "resolved", reporter: "Henry Zhang", date: "2026-03-14", mttr: "1.5h" },
  { id: "INC-009", title: "Data pipeline corruption", severity: "critical", type: "data breach", status: "investigating", reporter: "Iris Patel", date: "2026-03-22", mttr: "ongoing" },
  { id: "INC-010", title: "Embedding service degradation", severity: "low", type: "model failure", status: "resolved", reporter: "Jack Brown", date: "2026-03-16", mttr: "30m" },
  { id: "INC-011", title: "Cross-tenant data exposure", severity: "critical", type: "data breach", status: "open", reporter: "Karen Lee", date: "2026-03-25", mttr: "ongoing" },
  { id: "INC-012", title: "Rate limit bypass", severity: "medium", type: "model failure", status: "resolved", reporter: "Leo Martinez", date: "2026-03-11", mttr: "2h" },
  { id: "INC-013", title: "Guardrail false positive", severity: "low", type: "model failure", status: "resolved", reporter: "Mia Johnson", date: "2026-03-09", mttr: "1h" },
  { id: "INC-014", title: "Model version mismatch", severity: "medium", type: "model failure", status: "resolved", reporter: "Noah Williams", date: "2026-03-13", mttr: "4h" },
  { id: "INC-015", title: "Prompt injection in bot", severity: "high", type: "data breach", status: "resolved", reporter: "Olivia Taylor", date: "2026-03-17", mttr: "2h" },
];

const sc = (s: string) => ({ critical: "bg-red-500/10 text-red-400", high: "bg-orange-500/10 text-orange-400", medium: "bg-yellow-500/10 text-yellow-400", low: "bg-green-500/10 text-green-400", resolved: "bg-green-500/10 text-green-400", investigating: "bg-yellow-500/10 text-yellow-400", open: "bg-red-500/10 text-red-400" }[s] || "bg-gray-500/10 text-gray-400");

export default function IncidentLog() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const filtered = mockData.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Incident Management</h1><Button className="bg-green-600 hover:bg-green-700"><Plus className="h-4 w-4 mr-2" />Report Incident</Button></div>
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold">15</div><div className="text-xs text-muted-foreground">Total</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-400">4</div><div className="text-xs text-muted-foreground">Critical</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-yellow-400">2</div><div className="text-xs text-muted-foreground">Investigating</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-400">10</div><div className="text-xs text-muted-foreground">Resolved</div></CardContent></Card>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search incidents..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Card className="border-border/50"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Title</TableHead><TableHead>Severity</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Reporter</TableHead><TableHead>Date</TableHead><TableHead>MTTR</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map(r => (<TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}><TableCell className="font-mono text-sm">{r.id}</TableCell><TableCell>{r.title}</TableCell><TableCell><Badge className={sc(r.severity)}>{r.severity}</Badge></TableCell><TableCell>{r.type}</TableCell><TableCell><Badge className={sc(r.status)}>{r.status}</Badge></TableCell><TableCell>{r.reporter}</TableCell><TableCell>{r.date}</TableCell><TableCell>{r.mttr}</TableCell></TableRow>))}</TableBody></Table></Card>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}><DialogContent><DialogHeader><DialogTitle>{selected?.title}</DialogTitle></DialogHeader>{selected && <div className="space-y-2 text-sm"><div>ID: {selected.id}</div><div>Severity: <Badge className={sc(selected.severity)}>{selected.severity}</Badge></div><div>Status: <Badge className={sc(selected.status)}>{selected.status}</Badge></div><div>Reporter: {selected.reporter}</div><div>MTTR: {selected.mttr}</div><div className="flex gap-2 pt-2"><Button size="sm" variant="outline">Edit</Button><Button size="sm" variant="destructive">Delete</Button></div></div>}</DialogContent></Dialog>
    </div>
  );
}
