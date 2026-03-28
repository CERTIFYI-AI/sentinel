
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Search, Plus, FileText, CheckCircle, Clock, XCircle } from "lucide-react";

const mockPolicies = [
  { id: "POL-001", name: "AI Acceptable Use Policy", category: "AI Governance", version: "3.1", status: "active", owner: "alice@company.com", lastReview: "2026-01-05", nextReview: "2026-07-05", approver: "ciso@company.com" },
  { id: "POL-002", name: "Data Privacy Policy", category: "Privacy", version: "2.4", status: "active", owner: "bob@company.com", lastReview: "2025-12-10", nextReview: "2026-06-10", approver: "dpo@company.com" },
  { id: "POL-003", name: "Incident Response Plan", category: "Security", version: "4.0", status: "active", owner: "carol@company.com", lastReview: "2025-11-20", nextReview: "2026-05-20", approver: "ciso@company.com" },
  { id: "POL-004", name: "Model Risk Management", category: "AI Governance", version: "1.2", status: "draft", owner: "dave@company.com", lastReview: "2026-01-12", nextReview: "2026-04-12", approver: "cto@company.com" },
  { id: "POL-005", name: "Vendor Security Policy", category: "Third Party", version: "2.0", status: "active", owner: "eve@company.com", lastReview: "2025-10-15", nextReview: "2026-04-15", approver: "ciso@company.com" },
  { id: "POL-006", name: "Data Retention Policy", category: "Privacy", version: "1.8", status: "review", owner: "frank@company.com", lastReview: "2025-09-01", nextReview: "2026-03-01", approver: "dpo@company.com" },
  { id: "POL-007", name: "Access Control Policy", category: "Security", version: "5.2", status: "active", owner: "alice@company.com", lastReview: "2026-01-02", nextReview: "2026-07-02", approver: "ciso@company.com" },
  { id: "POL-008", name: "Bias & Fairness Policy", category: "AI Governance", version: "1.0", status: "draft", owner: "bob@company.com", lastReview: "2026-01-14", nextReview: "2026-04-14", approver: "ethics@company.com" },
];

const statusColor = (s:string) => s==="active" ? "bg-green-500/10 text-green-400 border-green-500/30" : s==="draft" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-blue-500/10 text-blue-400 border-blue-500/30";

export default function Policies() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [selected, setSelected] = useState<any>(null);
  const cats = ["All", ...Array.from(new Set(mockPolicies.map(p => p.category)))];
  const filtered = mockPolicies.filter(p => (cat === "All" || p.category === cat) && (p.name.toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Policy Management</h1><p className="text-sm text-gray-400">Manage organizational policies and procedures</p></div>
        <Button className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4 mr-2" />New Policy</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Total Policies",value:mockPolicies.length,color:"text-white"},{label:"Active",value:mockPolicies.filter(p=>p.status==="active").length,color:"text-green-400"},{label:"Draft",value:mockPolicies.filter(p=>p.status==="draft").length,color:"text-yellow-400"},{label:"In Review",value:mockPolicies.filter(p=>p.status==="review").length,color:"text-blue-400"}].map(s=>(
          <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4"><p className="text-xs text-gray-400">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>
      <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><Input placeholder="Search policies..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-gray-800 border-gray-700 text-white" /></div>
          <select value={cat} onChange={e=>setCat(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">{cats.map(c=><option key={c}>{c}</option>)}</select>
        </div>
        <Table>
          <TableHeader><TableRow className="border-gray-800"><TableHead className="text-gray-400">ID</TableHead><TableHead className="text-gray-400">Name</TableHead><TableHead className="text-gray-400">Category</TableHead><TableHead className="text-gray-400">Version</TableHead><TableHead className="text-gray-400">Status</TableHead><TableHead className="text-gray-400">Owner</TableHead><TableHead className="text-gray-400">Next Review</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map(p=>(
            <TableRow key={p.id} className="border-gray-800 hover:bg-gray-800/50 cursor-pointer" onClick={()=>setSelected(p)}>
              <TableCell className="text-green-400 font-mono text-xs">{p.id}</TableCell>
              <TableCell className="text-white font-medium">{p.name}</TableCell>
              <TableCell><span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{p.category}</span></TableCell>
              <TableCell className="text-gray-300">v{p.version}</TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded border ${statusColor(p.status)}`}>{p.status}</span></TableCell>
              <TableCell className="text-gray-400 text-xs">{p.owner}</TableCell>
              <TableCell className="text-gray-400 text-xs">{p.nextReview}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={!!selected} onOpenChange={()=>setSelected(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && <div className="grid grid-cols-2 gap-3 text-sm">
            {[["ID",selected.id],["Category",selected.category],["Version","v"+selected.version],["Status",selected.status],["Owner",selected.owner],["Approver",selected.approver],["Last Review",selected.lastReview],["Next Review",selected.nextReview]].map(([k,v])=>(
              <div key={k}><p className="text-gray-400 text-xs">{k}</p><p className="text-white">{v}</p></div>
            ))}
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
