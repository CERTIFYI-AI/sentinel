import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Shield, MagnifyingGlass as Search, Funnel as Filter, Plus, DownloadSimple as Download } from "@phosphor-icons/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
const columns = [  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "status", label: "Status" },
  { key: "framework", label: "Framework" },
  { key: "score", label: "Score" },
  { key: "due", label: "Due Date" },];
const mockData: any[] = [  { id: 1, name: "Access Control Policy", status: "compliant", framework: "ISO 27001", score: 95, due: "2026-06-30" },
  { id: 2, name: "Data Privacy", status: "partial", framework: "GDPR", score: 78, due: "2026-04-15" },
  { id: 3, name: "Incident Response", status: "compliant", framework: "SOC 2", score: 92, due: "2026-05-01" },
  { id: 4, name: "Risk Assessment", status: "non-compliant", framework: "NIST", score: 45, due: "2026-03-30" },
  { id: 5, name: "Vendor Management", status: "compliant", framework: "ISO 27001", score: 88, due: "2026-07-15" },];
const statsCards = [  { label: "Compliance", value: "87%", icon: Shield },
  { label: "Controls", value: "342", icon: Shield },
  { label: "Gaps", value: "18", icon: Shield },
  { label: "Evidence", value: "1.2K", icon: Shield },];
export default function GapAnalysisModal() {
  const [search, setSearch] = useState("");
  const [sf, setSf] = useState("all");
  const [sel, setSel] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const sts = ["all", ...Array.from(new Set(mockData.map((d) => d.status||d.severity||"active")))];
  const filt = mockData.filter((d) => JSON.stringify(d).toLowerCase().includes(search.toLowerCase()) && (sf==="all"||(d.status||d.severity)===sf));
  const ch = mockData.slice(0,6).map((d,i) => ({ name: d.name||d.title||"I"+(i+1), value: d.score||d.count||50+i*10 }));
  return (<div className="p-6 space-y-6"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Gap Analysis</h1><div className="flex gap-2"><Button size="sm" variant="outline"><Download size={16} className="mr-1"/>Export</Button><Button size="sm"><Plus size={16} className="mr-1"/>Add New</Button></div></div>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{statsCards.map((s:any,i:number)=>(<Card key={i}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></div><s.icon size={32} className="text-[hsl(var(--brand))]"/></div></CardContent></Card>))}</div>
  <Card><CardHeader><CardTitle>Overview</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={250}><BarChart data={ch}><XAxis dataKey="name" fontSize={12}/><YAxis fontSize={12}/><Tooltip/><Bar dataKey="value" fill="#10b981" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></CardContent></Card>
  <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Records</CardTitle><div className="flex gap-2"><div className="relative"><Search size={16} className="absolute left-2.5 top-2.5 text-muted-foreground"/><Input placeholder="Search..." value={search} onChange={(e)=>setSearch(e.target.value)} className="pl-8 w-64"/></div><select className="border rounded px-3 py-1.5 text-sm bg-background" value={sf} onChange={(e)=>setSf(e.target.value)}>{sts.map(s=><option key={s} value={s}>{s==="all"?"All":s}</option>)}</select></div></div></CardHeader><CardContent><div className="border rounded-lg overflow-hidden"><table className="w-full"><thead className="bg-muted/50"><tr>{columns.map((c:any)=><th key={c.key} className="text-left p-3 text-sm font-medium">{c.label}</th>)}<th className="text-left p-3 text-sm font-medium">Actions</th></tr></thead><tbody>{filt.map((row:any,i:number)=>(<tr key={i} className="border-t hover:bg-muted/30 cursor-pointer" onClick={()=>{setSel(row);setOpen(true);}}>{columns.map((c:any)=>(<td key={c.key} className="p-3 text-sm">{c.key==="status"||c.key==="severity"?(<Badge variant={row[c.key]==="critical"||row[c.key]==="high"?"destructive":row[c.key]==="compliant"||row[c.key]==="active"||row[c.key]==="low"?"default":"secondary"}>{row[c.key]}</Badge>):String(row[c.key]??"")}</td>))}<td className="p-3"><Button size="sm" variant="ghost" onClick={(e)=>{e.stopPropagation();setSel(row);setOpen(true);}}>View</Button></td></tr>))}</tbody></table></div><p className="text-sm text-muted-foreground mt-2">{filt.length} of {mockData.length} records</p></CardContent></Card>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{sel?.name||sel?.title||"Detail"}</DialogTitle></DialogHeader><div className="space-y-3">{sel&&Object.entries(sel).map(([k,v])=>(<div key={k} className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground capitalize">{k}</span><span className="text-sm font-medium">{String(v)}</span></div>))}<div className="flex gap-2 pt-2"><Button size="sm">Edit</Button><Button size="sm" variant="outline">Archive</Button><Button size="sm" variant="destructive">Delete</Button></div></div></DialogContent></Dialog></div>);
}
