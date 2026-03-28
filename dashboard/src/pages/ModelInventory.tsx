import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Search, Plus } from "lucide-react";

const mockModels = [
  { id: "MDL-001", name: "GPT-4-Turbo", provider: "OpenAI", version: "4.0-turbo", type: "LLM", status: "production", riskLevel: "medium", complianceScore: 87, lastAssessed: "2025-06-01" },
  { id: "MDL-002", name: "Claude-3-Opus", provider: "Anthropic", version: "3.0-opus", type: "LLM", status: "production", riskLevel: "low", complianceScore: 92, lastAssessed: "2025-05-28" },
  { id: "MDL-003", name: "Gemini-Pro", provider: "Google", version: "1.5-pro", type: "LLM", status: "staging", riskLevel: "medium", complianceScore: 78, lastAssessed: "2025-05-20" },
  { id: "MDL-004", name: "Llama-3-70B", provider: "Meta", version: "3.0-70b", type: "LLM", status: "production", riskLevel: "high", complianceScore: 65, lastAssessed: "2025-05-15" },
  { id: "MDL-005", name: "GPT-4-Vision", provider: "OpenAI", version: "4.0-v", type: "Vision", status: "production", riskLevel: "medium", complianceScore: 84, lastAssessed: "2025-06-02" },
  { id: "MDL-006", name: "text-embedding-3-large", provider: "OpenAI", version: "3.0", type: "Embedding", status: "production", riskLevel: "low", complianceScore: 95, lastAssessed: "2025-05-30" },
  { id: "MDL-007", name: "Claude-3-Haiku", provider: "Anthropic", version: "3.0-haiku", type: "LLM", status: "production", riskLevel: "low", complianceScore: 90, lastAssessed: "2025-06-01" },
  { id: "MDL-008", name: "Mistral-Large", provider: "Mistral", version: "2.0", type: "LLM", status: "staging", riskLevel: "medium", complianceScore: 73, lastAssessed: "2025-05-18" },
  { id: "MDL-009", name: "DALL-E-3", provider: "OpenAI", version: "3.0", type: "Vision", status: "deprecated", riskLevel: "high", complianceScore: 58, lastAssessed: "2025-04-10" },
  { id: "MDL-010", name: "Whisper-Large-v3", provider: "OpenAI", version: "3.0", type: "Audio", status: "production", riskLevel: "low", complianceScore: 91, lastAssessed: "2025-05-25" },
  { id: "MDL-011", name: "Cohere-Command-R+", provider: "Cohere", version: "r-plus", type: "LLM", status: "staging", riskLevel: "medium", complianceScore: 76, lastAssessed: "2025-05-22" },
  { id: "MDL-012", name: "Stable-Diffusion-XL", provider: "Stability", version: "xl-1.0", type: "Vision", status: "deprecated", riskLevel: "high", complianceScore: 52, lastAssessed: "2025-03-15" },
];

const sc = (s: string) => s === "production" ? "bg-green-500/10 text-green-400 border-green-500/30" : s === "staging" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-red-500/10 text-red-400 border-red-500/30";
const rc = (r: string) => r === "low" ? "bg-green-500/10 text-green-400 border-green-500/30" : r === "medium" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-red-500/10 text-red-400 border-red-500/30";

export default function ModelInventory() {
  const [search, setSearch] = useState("");
  const [pf, setPf] = useState("all");
  const [sel, setSel] = useState<typeof mockModels[0] | null>(null);
  const filtered = mockModels.filter(m => (pf === "all" || m.provider === pf) && (m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase())));
  const stats = { total: mockModels.length, prod: mockModels.filter(m => m.status === "production").length, high: mockModels.filter(m => m.riskLevel === "high").length, avg: Math.round(mockModels.reduce((a, m) => a + m.complianceScore, 0) / mockModels.length) };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">AI Model Inventory</h1><p className="text-muted-foreground">Catalog of all AI models</p></div>
        <Button className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2" />Register Model</Button></div>
      <div className="grid grid-cols-4 gap-4">
        {[["Total Models", stats.total, ""], ["In Production", stats.prod, "text-green-400"], ["High Risk", stats.high, "text-red-400"], ["Avg Compliance", stats.avg + "%", ""]].map(([l, v, c]) => (
          <Card key={String(l)}><CardContent className="pt-6"><div className="text-sm text-muted-foreground">{l}</div><div className={`text-3xl font-bold ${c}`}>{v}</div></CardContent></Card>
        ))}
      </div>
      <div className="flex gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input placeholder="Search models..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={pf} onValueChange={setPf}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Providers</SelectItem>{[...new Set(mockModels.map(m => m.provider))].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
      </div>
      <Card><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Provider</TableHead><TableHead>Version</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Risk</TableHead><TableHead>Compliance</TableHead><TableHead>Assessed</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map(m => (<TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSel(m)}>
          <TableCell className="font-mono text-sm">{m.id}</TableCell><TableCell className="font-medium">{m.name}</TableCell><TableCell>{m.provider}</TableCell><TableCell>{m.version}</TableCell><TableCell>{m.type}</TableCell>
          <TableCell><span className={`px-2 py-1 rounded-full text-xs border ${sc(m.status)}`}>{m.status}</span></TableCell>
          <TableCell><span className={`px-2 py-1 rounded-full text-xs border ${rc(m.riskLevel)}`}>{m.riskLevel}</span></TableCell>
          <TableCell><div className="flex items-center gap-2"><div className="w-16 bg-muted rounded-full h-2"><div className="h-2 rounded-full bg-green-500" style={{width:`${m.complianceScore}%`}}/></div>{m.complianceScore}%</div></TableCell>
          <TableCell>{m.lastAssessed}</TableCell></TableRow>))}</TableBody></Table></Card>
      <Dialog open={!!sel} onOpenChange={() => setSel(null)}><DialogContent><DialogHeader><DialogTitle>{sel?.name}</DialogTitle></DialogHeader>
        {sel && <div className="space-y-3"><div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">ID:</span> {sel.id}</div><div><span className="text-muted-foreground">Provider:</span> {sel.provider}</div>
          <div><span className="text-muted-foreground">Version:</span> {sel.version}</div><div><span className="text-muted-foreground">Type:</span> {sel.type}</div>
          <div><span className="text-muted-foreground">Status:</span> <span className={`px-2 py-1 rounded-full text-xs border ${sc(sel.status)}`}>{sel.status}</span></div>
          <div><span className="text-muted-foreground">Risk:</span> <span className={`px-2 py-1 rounded-full text-xs border ${rc(sel.riskLevel)}`}>{sel.riskLevel}</span></div>
        </div><div className="flex gap-2 pt-2"><Button size="sm" variant="outline">Edit</Button><Button size="sm" variant="destructive">Delete</Button></div></div>}
      </DialogContent></Dialog>
    </div>);
}
