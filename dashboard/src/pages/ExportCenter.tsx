import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Shield, Search, Filter, Plus, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
const columns = [  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "status", label: "Status" },
  { key: "type", label: "Type" },
  { key: "score", label: "Score" },
  { key: "date", label: "Date" },];
const mockData: any[] = [  { id: 1, name: "Item One", status: "active", type: "Primary", score: 90, date: "2024-03-15" },
  { id: 2, name: "Item Two", status: "completed", type: "Secondary", score: 82, date: "2024-03-14" },
  { id: 3, name: "Item Three", status: "pending", type: "Primary", score: 75, date: "2024-03-13" },
  { id: 4, name: "Item Four", status: "active", type: "Tertiary", score: 88, date: "2024-03-12" },
  { id: 5, name: "Item Five", status: "archived", type: "Secondary", score: 65, date: "2024-03-11" },];
const statsCards = [  { label: "Total", value: "312", icon: Shield },
  { label: "Active", value: "245", icon: Shield },
  { label: "Pending", value: "42", icon: Shield },
  { label: "Completed", value: "25", icon: Shield },];
export default function ExportCenter() {
  const [search, setSearch] = useState("");
  const [sf, setSf] = useState("all");
  const [sel, setSel] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const sts = ["all", ...Array.from(new Set(mockData.map((d) => d.status||d.severity||"active")))];
  const filt = mockData.filter((d) => JSON.stringify(d).toLowerCase().includes(search.toLowerCase()) && (sf==="all"||(d.status||d.severity)===sf));
  const ch = mockData.slice(0,6).map((d,i) => ({ name: d.name||d.title||"I"+(i+1), value: d.score||d.count||50+i*10 }));
  return (<div className="p-6 space-y-6"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Export Center</h1><div className="flex gap-2"><Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1"/>Export</Button><Button size="sm"><Plus className="h-4 w-4 mr-1"/>Add New</Button></div></div>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{statsCards.map((s:any,i:number)=>(<Card key={i}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></div><s.icon className="h-8 w-8 text-emerald-500"/></div></CardContent></Card>))}</div>
  <Card><CardHeader><CardTitle>Overview</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={250}><BarChart data={ch}><XAxis dataKey="name" fontSize={12}/><YAxis fontSize={12}/><Tooltip/><Bar dataKey="value" fill="#10b981" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></CardContent></Card>
  <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Records</CardTitle><div className="flex gap-2"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/><Input placeholder="Search..." value={search} onChange={(e)=>setSearch(e.target.value)} className="pl-8 w-64"/></div><select className="border rounded px-3 py-1.5 text-sm bg-background" value={sf} onChange={(e)=>setSf(e.target.value)}>{sts.map(s=><option key={s} value={s}>{s==="all"?"All":s}</option>)}</select></div></div></CardHeader><CardContent><div className="border rounded-lg overflow-hidden"><table className="w-full"><thead className="bg-muted/50"><tr>{columns.map((c:any)=><th key={c.key} className="text-left p-3 text-sm font-medium">{c.label}</th>)}<th className="text-left p-3 text-sm font-medium">Actions</th></tr></thead><tbody>{filt.map((row:any,i:number)=>(<tr key={i} className="border-t hover:bg-muted/30 cursor-pointer" onClick={()=>{setSel(row);setOpen(true);}}>{columns.map((c:any)=>(<td key={c.key} className="p-3 text-sm">{c.key==="status"||c.key==="severity"?(<Badge variant={row[c.key]==="critical"||row[c.key]==="high"?"destructive":row[c.key]==="compliant"||row[c.key]==="active"||row[c.key]==="low"?"default":"secondary"}>{row[c.key]}</Badge>):String(row[c.key]??"")}</td>))}<td className="p-3"><Button size="sm" variant="ghost" onClick={(e)=>{e.stopPropagation();setSel(row);setOpen(true);}}>View</Button></td></tr>))}</tbody></table></div><p className="text-sm text-muted-foreground mt-2">{filt.length} of {mockData.length} records</p></CardContent></Card>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{sel?.name||sel?.title||"Detail"}</DialogTitle></DialogHeader><div className="space-y-3">{sel&&Object.entries(sel).map(([k,v])=>(<div key={k} className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground capitalize">{k}</span><span className="text-sm font-medium">{String(v)}</span></div>))}<div className="flex gap-2 pt-2"><Button size="sm">Edit</Button><Button size="sm" variant="outline">Archive</Button><Button size="sm" variant="destructive">Delete</Button></div></div></DialogContent></Dialog></div>);
}
