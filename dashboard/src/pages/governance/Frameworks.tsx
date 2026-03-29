import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Progress } from "../../components/ui/progress";
import { Shield, CheckCircle, XCircle, Search, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const frameworks = [
  { id: 1, name: "ISO 27001", score: 87, status: "compliant", controls: 114, passing: 99, failing: 15, lastAudit: "2024-12-01", owner: "Sarah Chen" },
  { id: 2, name: "SOC 2 Type II", score: 82, status: "compliant", controls: 96, passing: 79, failing: 17, lastAudit: "2024-11-15", owner: "Mike Johnson" },
  { id: 3, name: "EU AI Act", score: 71, status: "partial", controls: 68, passing: 48, failing: 20, lastAudit: "2024-10-28", owner: "Lisa Park" },
  { id: 4, name: "NIST AI RMF", score: 79, status: "compliant", controls: 82, passing: 65, failing: 17, lastAudit: "2024-11-20", owner: "David Kim" },
  { id: 5, name: "OWASP LLM Top 10", score: 68, status: "partial", controls: 45, passing: 31, failing: 14, lastAudit: "2024-09-30", owner: "Anna Lee" },
  { id: 6, name: "GDPR AI Provisions", score: 91, status: "compliant", controls: 52, passing: 47, failing: 5, lastAudit: "2024-12-10", owner: "Tom Brown" },
];

const chartData = frameworks.map(f => ({ name: f.name.substring(0, 12), score: f.score }));
const pieData = [
  { name: "Compliant", value: frameworks.filter(f => f.status === "compliant").length },
  { name: "Partial", value: frameworks.filter(f => f.status === "partial").length },
];
const COLORS = ["#16a34a", "#eab308", "#ef4444"];

export default function Frameworks() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const filtered = frameworks.filter(f => (filterStatus === "all" || f.status === filterStatus) && f.name.toLowerCase().includes(search.toLowerCase()));
  const avgScore = Math.round(frameworks.reduce((a, b) => a + b.score, 0) / frameworks.length);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Compliance Frameworks</h1>
        <Badge variant="outline" className="text-green-600 border-green-600">Avg Score: {avgScore}%</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{frameworks.length}</div><p className="text-sm text-muted-foreground">Total Frameworks</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{frameworks.filter(f=>f.status==="compliant").length}</div><p className="text-sm text-muted-foreground">Compliant</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{frameworks.filter(f=>f.status==="partial").length}</div><p className="text-sm text-muted-foreground">Partial</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{avgScore}%</div><p className="text-sm text-muted-foreground">Average Score</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Framework Scores</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={250}><BarChart data={chartData}><XAxis dataKey="name" fontSize={11}/><YAxis/><Tooltip/><Bar dataKey="score" fill="#16a34a" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Compliance Distribution</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>{pieData.map((_, i) => <Cell key={i} fill={COLORS[i]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Frameworks</CardTitle>
            <div className="flex gap-2">
              <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/><input className="pl-8 h-9 border rounded-md text-sm w-64" placeholder="Search frameworks..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
              <select className="h-9 border rounded-md text-sm px-2" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="all">All Status</option><option value="compliant">Compliant</option><option value="partial">Partial</option></select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left p-2">Framework</th><th className="text-left p-2">Score</th><th className="text-left p-2">Status</th><th className="text-left p-2">Controls</th><th className="text-left p-2">Owner</th><th className="text-left p-2">Last Audit</th><th className="p-2">Actions</th></tr></thead>
            <tbody>{filtered.map(f => (
              <tr key={f.id} className="border-b hover:bg-muted/50">
                <td className="p-2 font-medium">{f.name}</td>
                <td className="p-2"><div className="flex items-center gap-2"><Progress value={f.score} className="w-20 h-2"/><span>{f.score}%</span></div></td>
                <td className="p-2"><Badge className={f.status==="compliant"?"bg-green-500":"bg-yellow-500"}>{f.status}</Badge></td>
                <td className="p-2">{f.passing}/{f.controls}</td>
                <td className="p-2">{f.owner}</td>
                <td className="p-2">{f.lastAudit}</td>
                <td className="p-2"><Button size="sm" variant="outline" onClick={()=>setSelected(f)}>View</Button></td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={()=>setSelected(null)}>
        <DialogContent><DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-muted-foreground">Compliance Score</p><p className="text-2xl font-bold">{selected?.score}%</p></div>
              <div><p className="text-sm text-muted-foreground">Controls Passing</p><p className="text-2xl font-bold">{selected?.passing}/{selected?.controls}</p></div>
            </div>
            <Progress value={selected?.score || 0} className="h-3"/>
            <div className="flex gap-4 text-sm"><div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500"/>{selected?.passing} passing</div><div className="flex items-center gap-1"><XCircle className="h-4 w-4 text-red-500"/>{selected?.failing} failing</div></div>
            <p className="text-sm"><strong>Owner:</strong> {selected?.owner}</p>
            <p className="text-sm"><strong>Last Audit:</strong> {selected?.lastAudit}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
