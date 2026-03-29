import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Search, Plus, Shield, Settings } from "lucide-react";
const sc = (s: string): string => ({active: "bg-green-500/10 text-green-400",success: "bg-green-500/10 text-green-400",verified: "bg-green-500/10 text-green-400",compliant: "bg-green-500/10 text-green-400",passing: "bg-green-500/10 text-green-400",pass: "bg-green-500/10 text-green-400",production: "bg-green-500/10 text-green-400",resolved: "bg-green-500/10 text-green-400",closed: "bg-green-500/10 text-green-400",enabled: "bg-green-500/10 text-green-400",approved: "bg-green-500/10 text-green-400",low: "bg-green-500/10 text-green-400",warning: "bg-yellow-500/10 text-yellow-400",review: "bg-yellow-500/10 text-yellow-400",pending: "bg-yellow-500/10 text-yellow-400",investigating: "bg-yellow-500/10 text-yellow-400",flagged: "bg-yellow-500/10 text-yellow-400",staging: "bg-yellow-500/10 text-yellow-400",draft: "bg-yellow-500/10 text-yellow-400",medium: "bg-yellow-500/10 text-yellow-400",open: "bg-red-500/10 text-red-400",failing: "bg-red-500/10 text-red-400",fail: "bg-red-500/10 text-red-400",critical: "bg-red-500/10 text-red-400",high: "bg-red-500/10 text-red-400",inactive: "bg-gray-500/10 text-gray-400",deprecated: "bg-gray-500/10 text-gray-400",expired: "bg-red-500/10 text-red-400"} as Record<string,string>)[s] || "bg-blue-500/10 text-blue-400";
const mockData: any[] = [
  { id: 1, name: "Item 1", status: "active", type: "Type A", owner: "Alice Chen", date: "2026-03-15" },
  { id: 2, name: "Item 2", status: "pending", type: "Type B", owner: "Bob Kumar", date: "2026-03-14" },
  { id: 3, name: "Item 3", status: "inactive", type: "Type A", owner: "Carol Davis", date: "2026-03-13" },
  { id: 4, name: "Item 4", status: "active", type: "Type C", owner: "Dave Wilson", date: "2026-03-12" },
  { id: 5, name: "Item 5", status: "active", type: "Type B", owner: "Eve Sharma", date: "2026-03-11" },
];
export default function EvidenceSyncEngine() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const filtered = mockData.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Evidence Repository</h1><Button className="bg-green-600 hover:bg-green-700"><Plus className="h-4 w-4 mr-2" />Add New</Button></div>
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold">5</div><div className="text-xs text-muted-foreground">Total Items</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-400">3</div><div className="text-xs text-muted-foreground">Active</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-yellow-400">1</div><div className="text-xs text-muted-foreground">Pending</div></CardContent></Card>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Card className="border-border/50"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map(r => (<TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}><TableCell>{r.id}</TableCell><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.type}</TableCell><TableCell><Badge className={sc(r.status)}>{r.status}</Badge></TableCell><TableCell>{r.owner}</TableCell><TableCell>{r.date}</TableCell><TableCell><Button size="sm" variant="outline">View</Button></TableCell></TableRow>))}
        </TableBody></Table></Card>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}><DialogContent><DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>{selected && <div className="space-y-2 text-sm">{Object.entries(selected).map(([k, v]) => <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>)}<div className="flex gap-2 pt-2"><Button size="sm" variant="outline">Edit</Button><Button size="sm" variant="destructive">Delete</Button></div></div>}</DialogContent></Dialog>
    </div>
  );
}
