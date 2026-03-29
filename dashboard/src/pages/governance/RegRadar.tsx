import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Globe, AlertTriangle, Search, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const regulations = [
  { id: 1, name: "EU AI Act Article 6", region: "EU", status: "enacted", impact: "high", effectiveDate: "2025-08-01", description: "Classification of high-risk AI systems" },
  { id: 2, name: "NIST AI 600-1", region: "US", status: "draft", impact: "medium", effectiveDate: "2025-03-15", description: "AI risk management companion" },
  { id: 3, name: "Canada AIDA", region: "CA", status: "proposed", impact: "high", effectiveDate: "2025-06-01", description: "Artificial Intelligence and Data Act" },
  { id: 4, name: "UK AI Safety Framework", region: "UK", status: "enacted", impact: "medium", effectiveDate: "2024-11-01", description: "Frontier AI safety guidelines" },
  { id: 5, name: "China AI Regulations", region: "CN", status: "enacted", impact: "high", effectiveDate: "2024-08-15", description: "Generative AI service management" },
  { id: 6, name: "Singapore AI Governance", region: "SG", status: "enacted", impact: "low", effectiveDate: "2024-06-01", description: "Model AI governance framework" },
];
const trendData = [{month:"Jul",count:3},{month:"Aug",count:5},{month:"Sep",count:4},{month:"Oct",count:7},{month:"Nov",count:6},{month:"Dec",count:8}];

export default function RegRadar() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const filtered = regulations.filter(r => (filter === "all" || r.status === filter) && r.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Regulatory Radar</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{regulations.length}</div><p className="text-sm text-muted-foreground">Tracked Regulations</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{regulations.filter(r=>r.impact==="high").length}</div><p className="text-sm text-muted-foreground">High Impact</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{regulations.filter(r=>r.status==="enacted").length}</div><p className="text-sm text-muted-foreground">Enacted</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{regulations.filter(r=>r.status==="draft"||r.status==="proposed").length}</div><p className="text-sm text-muted-foreground">Pending</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Regulation Trend</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={200}><LineChart data={trendData}><XAxis dataKey="month"/><YAxis/><Tooltip/><Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2}/></LineChart></ResponsiveContainer></CardContent></Card>
      <Card><CardHeader><div className="flex justify-between items-center"><CardTitle>Regulations</CardTitle><div className="flex gap-2"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/><input className="pl-8 h-9 border rounded-md text-sm w-64" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/></div><select className="h-9 border rounded-md text-sm px-2" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All</option><option value="enacted">Enacted</option><option value="draft">Draft</option><option value="proposed">Proposed</option></select></div></div></CardHeader>
        <CardContent><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left p-2">Regulation</th><th className="text-left p-2">Region</th><th className="text-left p-2">Status</th><th className="text-left p-2">Impact</th><th className="text-left p-2">Effective</th><th className="p-2">Action</th></tr></thead>
          <tbody>{filtered.map(r=>(<tr key={r.id} className="border-b hover:bg-muted/50"><td className="p-2 font-medium">{r.name}</td><td className="p-2"><Badge variant="outline">{r.region}</Badge></td><td className="p-2"><Badge className={r.status==="enacted"?"bg-green-500":r.status==="draft"?"bg-yellow-500":"bg-blue-500"}>{r.status}</Badge></td><td className="p-2"><Badge className={r.impact==="high"?"bg-red-500":r.impact==="medium"?"bg-yellow-500":"bg-green-500"}>{r.impact}</Badge></td><td className="p-2">{r.effectiveDate}</td><td className="p-2"><Button size="sm" variant="outline" onClick={()=>setSelected(r)}>Details</Button></td></tr>))}</tbody></table></CardContent></Card>
      <Dialog open={!!selected} onOpenChange={()=>setSelected(null)}><DialogContent><DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader><div className="space-y-3"><p className="text-sm">{selected?.description}</p><div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-muted-foreground">Region</p><p className="font-medium">{selected?.region}</p></div><div><p className="text-sm text-muted-foreground">Impact</p><Badge className={selected?.impact==="high"?"bg-red-500":"bg-yellow-500"}>{selected?.impact}</Badge></div></div><p className="text-sm"><strong>Effective:</strong> {selected?.effectiveDate}</p></div></DialogContent></Dialog>
    </div>
  );
}
