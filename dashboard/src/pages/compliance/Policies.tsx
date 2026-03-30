import {useState} from "react";
import {Card,CardContent,CardHeader,CardTitle} from "../components/ui/card";
import {Badge} from "../components/ui/badge";
import {Button} from "../components/ui/button";
import {Input} from "../components/ui/input";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter} from "../components/ui/dialog";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "../components/ui/select";
import {Plus,Search,Edit,Trash2,Eye,Download,Filter} from "lucide-react";

const mockData: any[] = [{"id": 1, "name": "Data Protection Policy", "category": "privacy", "status": "active", "owner": "Alice Chen", "version": "v2.1", "framework": "ISO 27001", "scope": "All employees", "description": "Data protection guidelines"}, {"id": 2, "name": "Access Control Policy", "category": "security", "status": "active", "owner": "Bob Kumar", "version": "v1.3", "framework": "SOC-2", "scope": "IT", "description": "Access management"}, {"id": 3, "name": "Incident Response Policy", "category": "security", "status": "review", "owner": "Carol Davis", "version": "v1.0", "framework": "NIST", "scope": "Security", "description": "IR procedures"}, {"id": 4, "name": "Business Continuity Policy", "category": "operations", "status": "active", "owner": "Dave Wilson", "version": "v3.0", "framework": "ISO 22301", "scope": "All", "description": "BCP"}, {"id": 5, "name": "Vendor Management Policy", "category": "procurement", "status": "pending", "owner": "Eve Sharma", "version": "v1.1", "framework": "SOC-2", "scope": "Procurement", "description": "Vendor governance"}, {"id": 6, "name": "AI Governance Policy", "category": "ai", "status": "active", "owner": "Frank Li", "version": "v1.0", "framework": "EU AI Act", "scope": "Engineering", "description": "AI governance"}];
const statsData: any[] = [{"label": "Total", "value": "6"}, {"label": "Active", "value": "4"}, {"label": "Review", "value": "1"}, {"label": "Pending", "value": "1"}];
const cols: any[] = [{"key": "name", "label": "Policy Name"}, {"key": "category", "label": "Category"}, {"key": "status", "label": "Status", "badge": true}, {"key": "owner", "label": "Owner"}, {"key": "version", "label": "Version"}, {"key": "framework", "label": "Framework"}];

export default function PolicyManagement() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState<any>(null);
  const [mode, setMode] = useState("");
  const [form, setForm] = useState<any>({});
  const [data, setData] = useState<any[]>(mockData);
  const filtered = data.filter(r =>
    JSON.stringify(r).toLowerCase().includes(search.toLowerCase()) &&
    (filter === "all" || r.status === filter || r.type === filter || r.severity === filter || r.category === filter || r.risk === filter)
  );
  const openAdd = () => { setForm({}); setMode("add"); };
  const openEdit = (r: any) => { setForm({...r}); setSel(r); setMode("edit"); };
  const openView = (r: any) => { setSel(r); setMode("view"); };
  const close = () => { setMode(""); setSel(null); setForm({}); };
  const save = () => {
    if (mode === "add") setData([...data, {...form, id: Date.now()}]);
    else setData(data.map(r => r.id === sel.id ? {...r, ...form} : r));
    close();
  };
  const del = (r: any) => { if (window.confirm("Delete " + (r.name || r.title || r.id) + "?")) setData(data.filter(d => d.id !== r.id)); };
  const bv = (s: string): any => ({critical:"destructive",high:"destructive",failed:"destructive",rejected:"destructive",active:"default",open:"default",enabled:"default",compliant:"default",passed:"default",approved:"default",warning:"secondary",medium:"secondary",pending:"secondary",review:"secondary",low:"outline",inactive:"outline",closed:"outline",disabled:"outline"})[s?.toLowerCase()] || "outline";
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Policies</h1><p className="text-sm text-muted-foreground">Manage compliance policies and requirements</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={()=>{const h=document.createElement('a');h.href='data:text/json,'+encodeURIComponent(JSON.stringify(data));h.download='export.json';h.click()}}><Download className="h-4 w-4 mr-1"/>Export</Button>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1"/>Add New</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsData.map((s,i)=>(<Card key={i}><CardContent className="pt-4"><div className="text-3xl font-bold text-green-600">{s.value}</div><div className="text-sm text-muted-foreground">{s.label}</div></CardContent></Card>))}
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Policies Records</CardTitle>
            <div className="flex gap-2">
              <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/><Input className="pl-8 w-64" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
              <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-40"><Filter className="h-4 w-4 mr-1"/><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent></Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>{cols.map((c:any)=>(<th key={c.key} className="text-left p-3 font-medium">{c.label}</th>))}<th className="p-3 font-medium text-left">Actions</th></tr></thead>
              <tbody>{filtered.map((row:any,i:number)=>(<tr key={i} className="border-t hover:bg-muted/30">{cols.map((c:any)=>(<td key={c.key} className="p-3">{c.badge?<Badge variant={bv(row[c.key])}>{row[c.key]}</Badge>:String(row[c.key]??"")}</td>))}<td className="p-3"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={()=>openView(row)}><Eye className="h-4 w-4"/></Button><Button size="sm" variant="ghost" onClick={()=>openEdit(row)}><Edit className="h-4 w-4"/></Button><Button size="sm" variant="ghost" className="text-destructive" onClick={()=>del(row)}><Trash2 className="h-4 w-4"/></Button></div></td></tr>))}</tbody>
            </table>
            <div className="p-3 text-sm text-muted-foreground border-t">Showing {filtered.length} of {data.length} records</div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={mode!==""} onOpenChange={close}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{mode==="view"?(sel?.name||sel?.title||"Details"):mode==="edit"?"Edit Record":"Add New Record"}</DialogTitle></DialogHeader>
          <div className="py-2">
            {mode==="view"&&sel?(
              <div className="grid grid-cols-2 gap-3">{Object.entries(sel).map(([k,v])=>(<div key={k} className="border rounded p-3"><div className="text-xs text-muted-foreground capitalize">{k}</div><div className="font-medium text-sm mt-1">{String(v)}</div></div>))}</div>
            ):(<div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Policy Name</label><Input className="mt-1" type="text" placeholder="Policy Name" value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></div>
<div><label className="text-sm font-medium">Category</label><Select value={form.category||""} onValueChange={v=>setForm({...form,category:v})}><SelectTrigger className="mt-1"><SelectValue placeholder="Category"/></SelectTrigger><SelectContent><SelectItem value="privacy">Privacy</SelectItem><SelectItem value="security">Security</SelectItem><SelectItem value="operations">Operations</SelectItem><SelectItem value="procurement">Procurement</SelectItem><SelectItem value="ai">Ai</SelectItem><SelectItem value="hr">Hr</SelectItem><SelectItem value="finance">Finance</SelectItem></SelectContent></Select></div>
<div><label className="text-sm font-medium">Status</label><Select value={form.status||""} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger className="mt-1"><SelectValue placeholder="Status"/></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent></Select></div>
<div><label className="text-sm font-medium">Owner</label><Input className="mt-1" type="text" placeholder="Owner" value={form.owner||""} onChange={e=>setForm({...form,owner:e.target.value})}/></div>
<div><label className="text-sm font-medium">Version</label><Input className="mt-1" type="text" placeholder="Version" value={form.version||""} onChange={e=>setForm({...form,version:e.target.value})}/></div>
<div><label className="text-sm font-medium">Framework</label><Select value={form.framework||""} onValueChange={v=>setForm({...form,framework:v})}><SelectTrigger className="mt-1"><SelectValue placeholder="Framework"/></SelectTrigger><SelectContent><SelectItem value="ISO 27001">Iso 27001</SelectItem><SelectItem value="SOC-2">Soc-2</SelectItem><SelectItem value="NIST">Nist</SelectItem><SelectItem value="GDPR">Gdpr</SelectItem><SelectItem value="EU AI Act">Eu Ai Act</SelectItem><SelectItem value="ISO 22301">Iso 22301</SelectItem></SelectContent></Select></div>
<div><label className="text-sm font-medium">Scope</label><Input className="mt-1" type="text" placeholder="Scope" value={form.scope||""} onChange={e=>setForm({...form,scope:e.target.value})}/></div>
<div className="col-span-2"><label className="text-sm font-medium">Description</label><textarea className="w-full border rounded p-2 text-sm mt-1" value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})}></textarea></div></div>)}
          </div>
          {mode!=="view"&&<DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={save}>{mode==="edit"?"Update":"Create"}</Button></DialogFooter>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
