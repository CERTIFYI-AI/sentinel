import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Shield, CheckCircle, AlertTriangle, XCircle, Search } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

const controls = [
  { id: 1, name: "Access Control Policy", framework: "ISO 27001", status: "compliant", evidence: 12, lastReview: "2024-12-01" },
  { id: 2, name: "Data Encryption", framework: "SOC 2", status: "compliant", evidence: 8, lastReview: "2024-11-20" },
  { id: 3, name: "AI Model Validation", framework: "EU AI Act", status: "non-compliant", evidence: 3, lastReview: "2024-10-15" },
  { id: 4, name: "Incident Response Plan", framework: "ISO 27001", status: "partial", evidence: 6, lastReview: "2024-11-30" },
  { id: 5, name: "Bias Testing Protocol", framework: "NIST AI RMF", status: "compliant", evidence: 9, lastReview: "2024-12-05" },
  { id: 6, name: "Data Retention Policy", framework: "GDPR", status: "compliant", evidence: 7, lastReview: "2024-11-28" },
  { id: 7, name: "Vendor Risk Assessment", framework: "SOC 2", status: "partial", evidence: 4, lastReview: "2024-10-22" },
  { id: 8, name: "Model Transparency", framework: "EU AI Act", status: "non-compliant", evidence: 2, lastReview: "2024-09-18" },
];
const pieData = [{name:"Compliant",value:4},{name:"Partial",value:2},{name:"Non-Compliant",value:2}];
const COLORS = ["#16a34a","#eab308","#ef4444"];
const frameworkData = [{name:"ISO 27001",score:87},{name:"SOC 2",score:82},{name:"EU AI Act",score:65},{name:"NIST AI",score:79},{name:"GDPR",score:91}];

export default function ComplianceDashboard() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = controls.filter(c => (filter === "all" || c.status === filter) && c.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Compliance Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Shield className="h-5 w-5 text-blue-500 mb-1"/><div className="text-2xl font-bold">{controls.length}</div><p className="text-sm text-muted-foreground">Total Controls</p></CardContent></Card>
        <Card><CardContent className="pt-4"><CheckCircle className="h-5 w-5 text-green-500 mb-1"/><div className="text-2xl font-bold text-green-600">4</div><p className="text-sm text-muted-foreground">Compliant</p></CardContent></Card>
        <Card><CardContent className="pt-4"><AlertTriangle className="h-5 w-5 text-yellow-500 mb-1"/><div className="text-2xl font-bold text-yellow-600">2</div><p className="text-sm text-muted-foreground">Partial</p></CardContent></Card>
        <Card><CardContent className="pt-4"><XCircle className="h-5 w-5 text-red-500 mb-1"/><div className="text-2xl font-bold text-red-600">2</div><p className="text-sm text-muted-foreground">Non-Compliant</p></CardContent></Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>{pieData.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Framework Scores</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={250}><BarChart data={frameworkData}><XAxis dataKey="name" fontSize={11}/><YAxis/><Tooltip/><Bar dataKey="score" fill="#16a34a" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
      <Card><CardHeader><div className="flex justify-between"><CardTitle>Controls</CardTitle><div className="flex gap-2"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/><input className="pl-8 h-9 border rounded-md text-sm w-64" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/></div><select className="h-9 border rounded-md text-sm px-2" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All</option><option value="compliant">Compliant</option><option value="partial">Partial</option><option value="non-compliant">Non-Compliant</option></select></div></div></CardHeader>
        <CardContent><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left p-2">Control</th><th className="text-left p-2">Framework</th><th className="text-left p-2">Status</th><th className="text-left p-2">Evidence</th><th className="text-left p-2">Last Review</th></tr></thead>
          <tbody>{filtered.map(c=>(<tr key={c.id} className="border-b hover:bg-muted/50"><td className="p-2 font-medium">{c.name}</td><td className="p-2"><Badge variant="outline">{c.framework}</Badge></td><td className="p-2"><Badge className={c.status==="compliant"?"bg-green-500":c.status==="partial"?"bg-yellow-500":"bg-red-500"}>{c.status}</Badge></td><td className="p-2">{c.evidence} items</td><td className="p-2">{c.lastReview}</td></tr>))}</tbody></table></CardContent></Card>
    </div>
  );
}
