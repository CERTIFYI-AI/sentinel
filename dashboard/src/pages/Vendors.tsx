
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Search, Plus, Building2, AlertTriangle, Shield } from "lucide-react";

const mockVendors = [
  { id: "VND-001", name: "OpenAI", category: "AI Model Provider", services: "GPT-4, DALL-E, Whisper", riskTier: 1, status: "active", lastAssessment: "2026-05-15", contractExpiry: "2026-01-31", contact: "enterprise@openai.com" },
  { id: "VND-002", name: "Anthropic", category: "AI Model Provider", services: "Claude-3 Opus/Haiku", riskTier: 1, status: "active", lastAssessment: "2026-05-20", contractExpiry: "2026-12-31", contact: "sales@anthropic.com" },
  { id: "VND-003", name: "AWS", category: "Cloud Infrastructure", services: "Bedrock, SageMaker", riskTier: 2, status: "active", lastAssessment: "2026-04-10", contractExpiry: "2026-03-15", contact: "aws-enterprise@amazon.com" },
  { id: "VND-004", name: "Microsoft Azure", category: "Cloud Infrastructure", services: "Azure OpenAI, Cognitive", riskTier: 2, status: "active", lastAssessment: "2026-05-01", contractExpiry: "2026-06-30", contact: "azure@microsoft.com" },
  { id: "VND-005", name: "HuggingFace", category: "Model Hub", services: "Model Hosting, Inference API", riskTier: 2, status: "under-review", lastAssessment: "2026-03-20", contractExpiry: "2026-09-30", contact: "enterprise@huggingface.co" },
  { id: "VND-006", name: "Pinecone", category: "Vector Database", services: "Vector Search, Embeddings", riskTier: 3, status: "active", lastAssessment: "2026-04-25", contractExpiry: "2026-11-30", contact: "sales@pinecone.io" },
  { id: "VND-007", name: "Datadog", category: "Monitoring", services: "LLM Observability", riskTier: 3, status: "active", lastAssessment: "2026-05-10", contractExpiry: "2026-02-28", contact: "sales@datadog.com" },
  { id: "VND-008", name: "Scale AI", category: "Data Labeling", services: "RLHF, Data Annotation", riskTier: 2, status: "inactive", lastAssessment: "2026-01-15", contractExpiry: "2026-06-30", contact: "enterprise@scale.com" },
];

const tierColor = (t: number) => t === 1 ? "bg-red-500/10 text-red-400 border-red-500/30" : t === 2 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-green-500/10 text-green-400 border-green-500/30";
const statusColor = (s: string) => s === "active" ? "bg-green-500/10 text-green-400 border-green-500/30" : s === "under-review" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-red-500/10 text-red-400 border-red-500/30";

export default function Vendors() {
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<typeof mockVendors[0] | null>(null);
  const filtered = mockVendors.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.category.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Vendor Registry</h1><p className="text-muted-foreground">Manage AI vendor relationships and risk</p></div>
        <Button className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2" />Add Vendor</Button></div>
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-muted-foreground" /><div><div className="text-sm text-muted-foreground">Total Vendors</div><div className="text-2xl font-bold">{mockVendors.length}</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-400" /><div><div className="text-sm text-muted-foreground">Active</div><div className="text-2xl font-bold text-green-400">{mockVendors.filter(v=>v.status==="active").length}</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /><div><div className="text-sm text-muted-foreground">Tier 1 (Critical)</div><div className="text-2xl font-bold text-red-400">{mockVendors.filter(v=>v.riskTier===1).length}</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-400" /><div><div className="text-sm text-muted-foreground">Under Review</div><div className="text-2xl font-bold text-yellow-400">{mockVendors.filter(v=>v.status==="under-review").length}</div></div></div></CardContent></Card>
      </div>
      <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input placeholder="Search vendors..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Card><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>AI Services</TableHead><TableHead>Risk Tier</TableHead><TableHead>Status</TableHead><TableHead>Last Assessment</TableHead><TableHead>Contract Expiry</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map(v => (<TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={()=>setSel(v)}>
          <TableCell className="font-mono text-sm">{v.id}</TableCell><TableCell className="font-medium">{v.name}</TableCell><TableCell>{v.category}</TableCell><TableCell className="max-w-[200px] truncate">{v.services}</TableCell>
          <TableCell><span className={`px-2 py-1 rounded-full text-xs border ${tierColor(v.riskTier)}`}>Tier {v.riskTier}</span></TableCell>
          <TableCell><span className={`px-2 py-1 rounded-full text-xs border ${statusColor(v.status)}`}>{v.status}</span></TableCell>
          <TableCell>{v.lastAssessment}</TableCell><TableCell>{v.contractExpiry}</TableCell></TableRow>))}</TableBody></Table></Card>
      <Dialog open={!!sel} onOpenChange={()=>setSel(null)}><DialogContent><DialogHeader><DialogTitle>{sel?.name}</DialogTitle></DialogHeader>
        {sel && <div className="space-y-3"><div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">ID:</span> {sel.id}</div><div><span className="text-muted-foreground">Category:</span> {sel.category}</div>
          <div><span className="text-muted-foreground">Services:</span> {sel.services}</div><div><span className="text-muted-foreground">Contact:</span> {sel.contact}</div>
          <div><span className="text-muted-foreground">Risk Tier:</span> <span className={`px-2 py-1 rounded-full text-xs border ${tierColor(sel.riskTier)}`}>Tier {sel.riskTier}</span></div>
          <div><span className="text-muted-foreground">Status:</span> <span className={`px-2 py-1 rounded-full text-xs border ${statusColor(sel.status)}`}>{sel.status}</span></div>
        </div><div className="flex gap-2 pt-2"><Button size="sm" variant="outline">Edit</Button><Button size="sm" variant="outline">Assessment</Button><Button size="sm" variant="destructive">Remove</Button></div></div>}
      </DialogContent></Dialog>
    </div>);
}
