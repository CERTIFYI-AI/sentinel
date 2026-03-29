import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { FileText, Search } from "lucide-react";

const policies = [
  { id: 1, name: "AI Acceptable Use Policy", version: "3.2", status: "active", owner: "Sarah Chen", lastUpdated: "2024-12-01", nextReview: "2025-06-01", description: "Defines acceptable use of AI systems" },
  { id: 2, name: "Data Governance Policy", version: "2.1", status: "active", owner: "Mike Johnson", lastUpdated: "2024-11-15", nextReview: "2025-05-15", description: "Data handling standards" },
  { id: 3, name: "Model Risk Management", version: "1.5", status: "review", owner: "Lisa Park", lastUpdated: "2024-10-01", nextReview: "2025-01-01", description: "Risk management for AI/ML models" },
  { id: 4, name: "Third-Party AI Policy", version: "2.0", status: "active", owner: "David Kim", lastUpdated: "2024-09-20", nextReview: "2025-03-20", description: "Third-party AI vendor guidelines" },
  { id: 5, name: "AI Ethics Framework", version: "1.0", status: "draft", owner: "Anna Lee", lastUpdated: "2024-12-10", nextReview: "2025-06-10", description: "Ethical AI principles" },
];

export default function Policies() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const filtered = policies.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Policy Management</h1><Button><FileText className="h-4 w-4 mr-2"/>New Policy</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{policies.length}</div><p className="text-sm text-muted-foreground">Total Policies</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{policies.filter(p=>p.status==="active").length}</div><p className="text-sm text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{policies.filter(p=>p.status!=="active").length}</div><p className="text-sm text-muted-foreground">Review/Draft</p></CardContent></Card>
      </div>
      <Card><CardHeader><div className="flex justify-between"><CardTitle>All Policies</CardTitle><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/><input className="pl-8 h-9 border rounded-md text-sm w-64" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div></CardHeader>
        <CardContent><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left p-2">Policy</th><th className="text-left p-2">Version</th><th className="text-left p-2">Status</th><th className="text-left p-2">Owner</th><th className="text-left p-2">Updated</th><th className="p-2">Actions</th></tr></thead>
          <tbody>{filtered.map(p=>(<tr key={p.id} className="border-b hover:bg-muted/50"><td className="p-2 font-medium">{p.name}</td><td className="p-2">v{p.version}</td><td className="p-2"><Badge className={p.status==="active"?"bg-green-500":p.status==="review"?"bg-yellow-500":"bg-blue-500"}>{p.status}</Badge></td><td className="p-2">{p.owner}</td><td className="p-2">{p.lastUpdated}</td><td className="p-2"><Button size="sm" variant="outline" onClick={()=>setSelected(p)}>View</Button></td></tr>))}</tbody></table></CardContent></Card>
      <Dialog open={!!selected} onOpenChange={()=>setSelected(null)}><DialogContent><DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader><div className="space-y-3"><p>{selected?.description}</p><div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-muted-foreground">Version</p><p className="font-medium">v{selected?.version}</p></div><div><p className="text-sm text-muted-foreground">Next Review</p><p className="font-medium">{selected?.nextReview}</p></div></div></div></DialogContent></Dialog>
    </div>
  );
}
