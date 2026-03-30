import{useState}from"react";import{Card,CardContent}from"../../components/ui/card";import{Badge}from"../../components/ui/badge";import{Button}from"../../components/ui/button";import{Input}from"../../components/ui/input";import{Search,RefreshCw,Upload,Link,CheckCircle,XCircle,Clock,Database}from"lucide-react";
const evidence=[{id:"EV-001",title:"SOC 2 Type II Report 2025",source:"Drata",framework:"SOC 2",control:"CC6.1",status:"synced",lastSync:"2026-03-14 09:00",size:"2.4 MB",type:"PDF",expires:"2026-12-31"},{id:"EV-002",title:"ISO 27001 Certificate",source:"Manual Upload",framework:"ISO 27001",control:"A.18.1",status:"synced",lastSync:"2026-03-10 14:30",size:"0.8 MB",type:"PDF",expires:"2027-03-01"},{id:"EV-003",title:"Pen Test Results Q1",source:"Cobalt.io",framework:"SOC 2",control:"CC7.1",status:"pending",lastSync:"2026-03-12 11:00",size:"5.1 MB",type:"PDF",expires:"2026-06-30"},{id:"EV-004",title:"Access Review Log Mar",source:"Okta",framework:"ISO 27001",control:"A.9.2",status:"synced",lastSync:"2026-03-15 08:00",size:"1.2 MB",type:"CSV",expires:"2026-04-30"},{id:"EV-005",title:"GDPR DPA Agreement",source:"Manual Upload",framework:"GDPR",control:"Art. 28",status:"expired",lastSync:"2025-12-01 10:00",size:"0.5 MB",type:"PDF",expires:"2026-01-01"},{id:"EV-006",title:"AI Model Risk Assessment",source:"Internal",framework:"EU AI Act",control:"Art. 9",status:"synced",lastSync:"2026-03-13 16:00",size:"3.2 MB",type:"DOCX",expires:"2026-09-30"}];
const sc:Record<string,string>={synced:"bg-green-500/20 text-green-400",pending:"bg-yellow-500/20 text-yellow-400",expired:"bg-red-500/20 text-red-400",failed:"bg-red-500/20 text-red-400"};
export default function EvidenceSyncEngine(){
  const[search,setSearch]=useState("");const[filter,setFilter]=useState("all");
  const filtered=evidence.filter(e=>(filter==="all"||e.status===filter)&&(e.title.toLowerCase().includes(search.toLowerCase())||e.framework.toLowerCase().includes(search.toLowerCase())));
  return(<div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Evidence Sync Engine</h1><p className="text-muted-foreground">Sync and manage compliance evidence from connected sources</p></div><div className="flex gap-2"><Button variant="outline"><RefreshCw className="w-4 h-4 mr-2"/>Sync All</Button><Button className="bg-green-600 hover:bg-green-700"><Upload className="w-4 h-4 mr-2"/>Upload</Button></div></div>
    <div className="grid grid-cols-4 gap-4">
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{evidence.length}</div><div className="text-sm text-muted-foreground">Total Evidence</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-green-400">{evidence.filter(e=>e.status==="synced").length}</div><div className="text-sm text-muted-foreground">Synced</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-yellow-400">{evidence.filter(e=>e.status==="pending").length}</div><div className="text-sm text-muted-foreground">Pending</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-red-400">{evidence.filter(e=>e.status==="expired").length}</div><div className="text-sm text-muted-foreground">Expired</div></CardContent></Card>
    </div>
    <div className="flex gap-3">
      <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground"/><Input placeholder="Search evidence..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9"/></div>
      {["all","synced","pending","expired"].map(s=><Button key={s} size="sm" variant={filter===s?"default":"outline"} onClick={()=>setFilter(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</Button>)}
    </div>
    <Card><CardContent className="p-0"><table className="w-full"><thead><tr className="border-b border-border">
      <th className="text-left p-3 text-sm font-medium text-muted-foreground">ID</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Title</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Source</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Framework</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Control</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Type</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Last Sync</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Actions</th>
    </tr></thead><tbody>{filtered.map(e=>(
      <tr key={e.id} className="border-b border-border hover:bg-muted/50">
        <td className="p-3 text-sm font-mono">{e.id}</td><td className="p-3 text-sm font-medium">{e.title}</td><td className="p-3 text-sm">{e.source}</td><td className="p-3 text-sm">{e.framework}</td><td className="p-3 text-sm font-mono">{e.control}</td><td className="p-3"><span className="text-xs bg-muted px-2 py-1 rounded">{e.type}</span></td><td className="p-3 text-xs text-muted-foreground">{e.lastSync}</td>
        <td className="p-3"><Badge className={sc[e.status]}>{e.status}</Badge></td>
        <td className="p-3"><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7">View</Button><Button size="sm" variant="outline" className="h-7"><RefreshCw className="w-3 h-3"/></Button></div></td>
      </tr>
    ))}</tbody></table></CardContent></Card>
  </div>);
}
