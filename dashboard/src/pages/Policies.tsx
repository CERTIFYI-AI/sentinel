import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Shield, FileText, Clock, AlertTriangle, Search, Plus, Download, ChevronUp, ChevronDown, ArrowUpDown, CheckCircle, XCircle, Eye, Edit, MoreHorizontal, Filter } from "lucide-react";
import { usePolicyStore } from "../stores/policyStore";

type SortKey = "id" | "name" | "status" | "category" | "riskLevel" | "updated" | "nextReview";
type SortDir = "asc" | "desc";

const POLICIES = [
  { id:"POL-001", name:"Acceptable AI Use Policy", category:"AI Usage", version:"v3.2", owner:"Emma Wilson", updated:"2026-02-15", framework:"EU AI Act", status:"Published" as const, riskLevel:"High" as const, nextReview:"2026-06-15", description:"Guidelines for responsible use of AI and ML systems across the organization.", scope:"All departments using AI/ML systems", approver:"Dr. Sarah Mitchell", controls:["CTL-AI-001","CTL-AI-003","CTL-AI-007"] },
  { id:"POL-002", name:"AI Model Risk Classification Standard", category:"AI Usage", version:"v2.1", owner:"James Chen", updated:"2026-01-20", framework:"NIST AI RMF", status:"Published" as const, riskLevel:"Critical" as const, nextReview:"2026-05-20", description:"Framework for classifying AI models by risk tier.", scope:"ML Engineering, Data Science", approver:"Chief Risk Officer", controls:["CTL-RM-001","CTL-RM-002"] },
  { id:"POL-003", name:"Data Privacy in AI Training", category:"Data Privacy", version:"v2.0", owner:"Maria Santos", updated:"2026-03-01", framework:"GDPR", status:"Published" as const, riskLevel:"High" as const, nextReview:"2026-07-01", description:"Privacy requirements for AI training data.", scope:"Data Engineering, ML Ops", approver:"DPO", controls:["CTL-DP-001","CTL-DP-004"] },
  { id:"POL-004", name:"AI Incident Response Procedure", category:"Incident Response", version:"v1.5", owner:"David Kim", updated:"2026-02-28", framework:"ISO 27001", status:"In Review" as const, riskLevel:"Critical" as const, nextReview:"2026-04-28", description:"Procedures for responding to AI system incidents.", scope:"Security Operations, AI Engineering", approver:"CISO", controls:["CTL-IR-001"] },
  { id:"POL-005", name:"Algorithmic Fairness & Bias Testing", category:"Fairness", version:"v2.3", owner:"Aisha Patel", updated:"2026-01-10", framework:"EU AI Act", status:"Published" as const, riskLevel:"High" as const, nextReview:"2026-05-10", description:"Requirements for bias testing in AI systems.", scope:"All AI/ML models in production", approver:"Ethics Board", controls:["CTL-FB-001","CTL-FB-002","CTL-FB-003"] },
  { id:"POL-006", name:"Bias Testing & Fairness Standard", category:"Fairness", version:"v1.8", owner:"Aisha Patel", updated:"2026-03-10", framework:"NIST AI RMF", status:"Published" as const, riskLevel:"Medium" as const, nextReview:"2026-07-10", description:"Standards for ongoing fairness validation.", scope:"Data Science, QA", approver:"Ethics Board", controls:["CTL-FB-004"] },
  { id:"POL-007", name:"Human Oversight Requirements", category:"AI Usage", version:"v1.4", owner:"Robert Taylor", updated:"2026-02-05", framework:"EU AI Act", status:"Published" as const, riskLevel:"High" as const, nextReview:"2026-06-05", description:"Requirements for human-in-the-loop oversight.", scope:"All high-risk AI systems", approver:"AI Governance Board", controls:["CTL-HO-001","CTL-HO-002"] },
  { id:"POL-008", name:"LLM Prompt Injection Prevention", category:"Security", version:"v1.2", owner:"David Kim", updated:"2026-02-28", framework:"OWASP LLM", status:"Draft" as const, riskLevel:"Critical" as const, nextReview:"2026-04-01", description:"Security controls for LLM prompt injection.", scope:"All LLM-integrated applications", approver:"CISO", controls:["CTL-SEC-001"] },
  { id:"POL-009", name:"AI Training Data Governance", category:"Data Privacy", version:"v1.0", owner:"Maria Santos", updated:"2025-12-15", framework:"GDPR", status:"Pending Review" as const, riskLevel:"High" as const, nextReview:"2026-03-15", description:"Governance framework for AI training datasets.", scope:"Data Engineering", approver:"DPO", controls:["CTL-DG-001","CTL-DG-002"] },
  { id:"POL-010", name:"AI Explainability & Transparency", category:"AI Usage", version:"v1.1", owner:"James Chen", updated:"2026-01-25", framework:"EU AI Act", status:"Published" as const, riskLevel:"Medium" as const, nextReview:"2026-05-25", description:"Requirements for AI decision explainability.", scope:"Customer-facing AI systems", approver:"Product VP", controls:["CTL-EX-001"] },
  { id:"POL-011", name:"Model Monitoring & Drift Detection", category:"AI Usage", version:"v1.3", owner:"Robert Taylor", updated:"2026-03-05", framework:"NIST AI RMF", status:"Expired" as const, riskLevel:"Medium" as const, nextReview:"2026-02-01", description:"Monitoring requirements for model performance drift.", scope:"ML Ops, Production AI", approver:"CTO", controls:["CTL-MM-001","CTL-MM-002"] },
  { id:"POL-012", name:"AI Supply Chain Security", category:"Security", version:"v1.0", owner:"Bob Kumar", updated:"2025-09-01", framework:"ISO 27001", status:"Archived" as const, riskLevel:"Medium" as const, nextReview:"2026-01-01", description:"Security requirements for AI supply chain.", scope:"Vendor Management, Procurement", approver:"CISO", controls:["CTL-SC-001"] },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  "Published": { color: "text-[hsl(var(--brand))]", bg: "bg-emerald-400/10 border-emerald-400/30", icon: CheckCircle },
  "Draft": { color: "text-muted-foreground", bg: "bg-slate-400/10 border-slate-400/30", icon: FileText },
  "In Review": { color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30", icon: Eye },
  "Pending Review": { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30", icon: Clock },
  "Expired": { color: "text-red-400", bg: "bg-red-400/10 border-red-400/30", icon: AlertTriangle },
  "Archived": { color: "text-muted-foreground", bg: "bg-gray-500/10 border-gray-500/30", icon: XCircle },
  "Changes Requested": { color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30", icon: Edit },
  "Approved": { color: "text-teal-400", bg: "bg-teal-400/10 border-teal-400/30", icon: CheckCircle },
};

const RISK_CONFIG: Record<string, string> = { Critical: "text-red-400 bg-red-400/10 border-red-400/30", High: "text-orange-400 bg-orange-400/10 border-orange-400/30", Medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", Low: "text-green-400 bg-green-400/10 border-green-400/30" };

const CHART_COLORS = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#ec4899"];
const REVIEW_DATA = [{m:"Oct",r:2},{m:"Nov",r:3},{m:"Dec",r:2},{m:"Jan",r:5},{m:"Feb",r:6},{m:"Mar",r:8}];

const VERSION_HISTORY = {
  "POL-001": [{v:"v3.2",date:"2026-02-15",author:"Emma Wilson",note:"Updated EU AI Act references"},{v:"v3.1",date:"2025-11-20",author:"Emma Wilson",note:"Added LLM-specific guidelines"},{v:"v3.0",date:"2025-08-10",author:"James Chen",note:"Major revision for AI Act compliance"}],
  "POL-002": [{v:"v2.1",date:"2026-01-20",author:"James Chen",note:"Risk tier refinement"},{v:"v2.0",date:"2025-09-15",author:"James Chen",note:"Added NIST alignment"},{v:"v1.1",date:"2025-04-01",author:"Robert Taylor",note:"Initial classification framework"}],
};

const CONTROLS_MAP: Record<string, {id:string;name:string;progress:number}[]> = {
  "POL-001": [{id:"CTL-AI-001",name:"AI Usage Monitoring",progress:85},{id:"CTL-AI-003",name:"Model Registration",progress:92},{id:"CTL-AI-007",name:"AI Output Validation",progress:67}],
  "POL-002": [{id:"CTL-RM-001",name:"Risk Assessment",progress:78},{id:"CTL-RM-002",name:"Impact Analysis",progress:60}],
  "POL-005": [{id:"CTL-FB-001",name:"Bias Detection",progress:90},{id:"CTL-FB-002",name:"Fairness Metrics",progress:75},{id:"CTL-FB-003",name:"Disparate Impact Testing",progress:82}],
};


export default function Policies() {
  const nav = useNavigate();
  const store = usePolicyStore();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fwFilter, setFwFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<typeof POLICIES[0] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const PER_PAGE = 6;

  const showToast = (msg: string, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null), 3000); };

  const getStatus = (p: typeof POLICIES[0]) => store.statusOverrides[p.id] || p.status;

  const categories = [...new Set(POLICIES.map(p=>p.category))];
  const frameworks = [...new Set(POLICIES.map(p=>p.framework))];
  const statuses = [...new Set(POLICIES.map(p=>getStatus(p)))];

  const filtered = useMemo(() => {
    let list = POLICIES.filter(p => {
      const s = getStatus(p);
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.id.toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter !== "all" && p.category !== catFilter) return false;
      if (statusFilter !== "all" && s !== statusFilter) return false;
      if (fwFilter !== "all" && p.framework !== fwFilter) return false;
      return true;
    });
    list.sort((a,b) => {
      let va: any = a[sortKey], vb: any = b[sortKey];
      if (sortKey === "status") { va = getStatus(a); vb = getStatus(b); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [search, catFilter, statusFilter, fwFilter, sortKey, sortDir, store.statusOverrides]);

  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const toggleSort = (key: SortKey) => { if (sortKey===key) setSortDir(d=>d==="asc"?"desc":"asc"); else { setSortKey(key); setSortDir("asc"); } };

  const statsPublished = POLICIES.filter(p=>getStatus(p)==="Published").length;
  const statsPending = POLICIES.filter(p=>["Pending Review","In Review","Draft"].includes(getStatus(p))).length;
  const statsAttention = POLICIES.filter(p=>["Expired","Changes Requested"].includes(getStatus(p))).length;

  const pieData = categories.map(c => ({ name: c, value: POLICIES.filter(p=>p.category===c).length }));

  const SortIcon = ({col}:{col:SortKey}) => sortKey===col ? (sortDir==="asc" ? <ChevronUp className="inline w-3 h-3 ml-1" /> : <ChevronDown className="inline w-3 h-3 ml-1" />) : <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-30" />;

  const StatusBadge = ({status}:{status:string}) => { const c = STATUS_CONFIG[status] || STATUS_CONFIG["Draft"]; const Icon = c.icon; return <Badge variant="outline" className={c.bg + " " + c.color + " border text-xs"}><Icon className="w-3 h-3 mr-1" />{status}</Badge>; };

  const RiskBadge = ({level}:{level:string}) => <Badge variant="outline" className={RISK_CONFIG[level] + " border text-xs"}>{level}</Badge>;

  const isOverdue = (d:string) => new Date(d) < new Date();

  return (
    <div className="space-y-6">
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${toast.type==="success"?"bg-[hsl(var(--brand))]/90 text-foreground":"bg-red-500/90 text-foreground"}`}>{toast.msg}</div>}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Policy Manager</h1><p className="text-sm text-muted-foreground mt-1">Manage AI governance policies, standards, and procedures</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={()=>showToast("Exported "+filtered.length+" policies to CSV")}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button size="sm" className="bg-[hsl(var(--brand))] hover:bg-primary/90" onClick={()=>setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Policy</Button>
        </div>
      </div>

      {/* STATS CARDS - clickable */}
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Total Policies",val:POLICIES.length,sub:"All policies in system",icon:FileText,color:"text-foreground",click:()=>{setStatusFilter("all");setPage(1);}},
          {label:"Published",val:statsPublished,sub:`${POLICIES.filter(p=>getStatus(p)==="Draft").length} draft, ${POLICIES.filter(p=>getStatus(p)==="Archived").length} archived`,icon:CheckCircle,color:"text-[hsl(var(--brand))]",click:()=>{setStatusFilter("Published");setPage(1);}},
          {label:"Pending Action",val:statsPending,sub:`${POLICIES.filter(p=>getStatus(p)==="In Review").length} in review, ${POLICIES.filter(p=>getStatus(p)==="Draft").length} drafts`,icon:Clock,color:"text-amber-400",click:()=>{setStatusFilter("Pending Review");setPage(1);}},
          {label:"Needs Attention",val:statsAttention,sub:`${POLICIES.filter(p=>getStatus(p)==="Expired").length} expired, ${POLICIES.filter(p=>getStatus(p)==="Archived").length} archived`,icon:AlertTriangle,color:"text-red-400",click:()=>{setStatusFilter("Expired");setPage(1);}}
        ].map((s,i) => (
          <Card key={i} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] cursor-pointer hover:border-emerald-400/40 transition-colors" onClick={s.click}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{s.label}</span><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-foreground">Policies by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({name,value})=>`${name}: ${value}`}>{pieData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">{pieData.map((d,i)=>(<span key={i} className="flex items-center gap-1 text-xs text-foreground"><span className="w-2.5 h-2.5 rounded-full" style={{background:CHART_COLORS[i%CHART_COLORS.length]}} />{d.name}</span>))}</div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-foreground">Policy Reviews (6 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={REVIEW_DATA}><XAxis dataKey="m" stroke="#64748b" fontSize={12} /><YAxis stroke="#64748b" fontSize={12} /><Tooltip /><Line type="monotone" dataKey="r" stroke="#10b981" strokeWidth={2} dot={{fill:"#10b981"}} name="Reviews" /></LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* FILTERS + SEARCH */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search policies... (/)" className="pl-9 bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] text-foreground" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} /></div>
        <Select value={catFilter} onValueChange={v=>{setCatFilter(v);setPage(1);}}><SelectTrigger className="w-[160px] bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] text-foreground"><SelectValue /></SelectTrigger><SelectContent>{["all",...categories].map(c=><SelectItem key={c} value={c}>{c==="all"?"All Categories":c}</SelectItem>)}</SelectContent></Select>
        <Select value={statusFilter} onValueChange={v=>{setStatusFilter(v);setPage(1);}}><SelectTrigger className="w-[160px] bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] text-foreground"><SelectValue /></SelectTrigger><SelectContent>{["all",...statuses].map(s=><SelectItem key={s} value={s}>{s==="all"?"All Status":s}</SelectItem>)}</SelectContent></Select>
        <Select value={fwFilter} onValueChange={v=>{setFwFilter(v);setPage(1);}}><SelectTrigger className="w-[160px] bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] text-foreground"><SelectValue /></SelectTrigger><SelectContent>{["all",...frameworks].map(f=><SelectItem key={f} value={f}>{f==="all"?"All Frameworks":f}</SelectItem>)}</SelectContent></Select>
      </div>


      {/* TABLE */}
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardContent className="p-0">
          <table className="w-full">
            <thead><tr className="border-b border-[hsl(var(--border))]">
              {[{k:"id" as SortKey,l:"ID",w:"w-20"},{k:"name" as SortKey,l:"Name",w:""},{k:"status" as SortKey,l:"Status",w:"w-36"},{k:"category" as SortKey,l:"Category",w:"w-28"},{k:"riskLevel" as SortKey,l:"Risk",w:"w-24"},{k:"updated" as SortKey,l:"Updated",w:"w-28"},{k:"nextReview" as SortKey,l:"Next Review",w:"w-28"}].map(h=>(
                <th key={h.k} className={`px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none ${h.w}`} onClick={()=>toggleSort(h.k)}>{h.l}<SortIcon col={h.k} /></th>
              ))}
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground w-24">Framework</th>
            </tr></thead>
            <tbody>
              {paged.map(p => { const st = getStatus(p); return (
                <tr key={p.id} className="border-b border-[hsl(var(--border))] hover:bg-white/5 cursor-pointer transition-colors" onClick={()=>{setSelected(p);setSheetOpen(true);}} title={p.name}>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{p.id}</td>
                  <td className="px-4 py-3"><span className="text-sm text-foreground font-medium truncate block max-w-[260px]" title={p.name}>{p.name}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={st} /></td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs border-white/20 text-foreground">{p.category}</Badge></td>
                  <td className="px-4 py-3"><RiskBadge level={p.riskLevel} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.updated}</td>
                  <td className={`px-4 py-3 text-xs ${isOverdue(p.nextReview)?"text-red-400 font-medium":"text-muted-foreground"}`}>{p.nextReview}{isOverdue(p.nextReview)&&" ⚠"}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs border-white/20 text-foreground">{p.framework}</Badge></td>
                </tr>
              );})}
            </tbody>
          </table>
          {/* PAGINATION */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))]">
            <span className="text-xs text-muted-foreground">Showing {(page-1)*PER_PAGE+1}-{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)} className="h-7 w-7 p-0 text-xs">&lt;</Button>
              {Array.from({length:totalPages},(_,i)=>(<Button key={i} variant={page===i+1?"default":"outline"} size="sm" onClick={()=>setPage(i+1)} className={`h-7 w-7 p-0 text-xs ${page===i+1?"bg-[hsl(var(--brand))]":""}`}>{i+1}</Button>))}
              <Button variant="outline" size="sm" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="h-7 w-7 p-0 text-xs">&gt;</Button>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* DETAIL SHEET */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="bg-[hsl(var(--bg-page))] border-[hsl(var(--border))] text-foreground w-[500px] overflow-y-auto">
          {selected && (<>
            <SheetHeader><SheetTitle className="text-foreground flex items-center gap-2">{selected.name}</SheetTitle></SheetHeader>
            <div className="flex flex-wrap gap-2 mt-3"><StatusBadge status={getStatus(selected)} /><Badge variant="outline" className="border-white/20 text-foreground text-xs">{selected.version}</Badge><Badge variant="outline" className="border-white/20 text-foreground text-xs">{selected.framework}</Badge><RiskBadge level={selected.riskLevel} /></div>
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="bg-white/5"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="versions">Versions</TabsTrigger><TabsTrigger value="controls">Controls</TabsTrigger></TabsList>
              <TabsContent value="overview" className="space-y-4 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  {[{l:"Category",v:selected.category},{l:"Version",v:selected.version},{l:"Owner",v:selected.owner},{l:"Framework",v:selected.framework},{l:"Status",v:getStatus(selected)},{l:"Risk Level",v:selected.riskLevel},{l:"Created",v:selected.updated},{l:"Next Review",v:selected.nextReview},{l:"Approver",v:selected.approver}].map(f=>(
                    <div key={f.l}><p className="text-xs text-muted-foreground">{f.l}</p><p className="text-sm text-foreground">{f.v}</p></div>
                  ))}
                </div>
                <Separator className="bg-white/10" />
                <div><p className="text-xs text-muted-foreground mb-1">Description</p><p className="text-sm text-foreground">{selected.description}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">Scope</p><p className="text-sm text-foreground">{selected.scope}</p></div>
                <Button className="w-full bg-[hsl(var(--brand))] hover:bg-primary/90 mt-2" onClick={()=>{setSheetOpen(false);nav(`/policy-editor?id=${selected.id}`);}}>Open Editor</Button>
              </TabsContent>
              <TabsContent value="versions" className="mt-3">
                {(VERSION_HISTORY[selected.id as keyof typeof VERSION_HISTORY] || [{v:selected.version,date:selected.updated,author:selected.owner,note:"Current version"}]).map((vh,i)=>(
                  <div key={i} className="flex items-start gap-3 py-3 border-b border-[hsl(var(--border))]">
                    <div className={`mt-1 w-2 h-2 rounded-full ${i===0?"bg-emerald-400":"bg-slate-500"}`} />
                    <div><div className="flex items-center gap-2"><span className="text-sm text-foreground font-medium">{vh.v}</span>{i===0&&<Badge className="bg-emerald-400/10 text-[hsl(var(--brand))] text-xs">Current</Badge>}</div><p className="text-xs text-muted-foreground mt-0.5">{vh.date} by {vh.author}</p><p className="text-xs text-slate-500 mt-0.5">{vh.note}</p></div>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="controls" className="mt-3 space-y-3">
                {(CONTROLS_MAP[selected.id] || selected.controls.map(c=>({id:c,name:c.replace("CTL-","Control "),progress:Math.floor(Math.random()*40+50)}))).map(c=>(
                  <div key={c.id} className="space-y-1">
                    <div className="flex justify-between"><span className="text-sm text-foreground">{c.name}</span><span className="text-xs text-muted-foreground">{c.progress}%</span></div>
                    <Progress value={c.progress} className="h-2" />
                    <p className="text-xs text-slate-500 font-mono">{c.id}</p>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </>)}
        </SheetContent>
      </Sheet>

      {/* CREATE DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[hsl(var(--bg-page))] border-[hsl(var(--border))] text-foreground max-w-lg">
          <DialogHeader><DialogTitle className="text-foreground">Create New Policy</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label className="text-foreground">Policy Name *</Label><Input placeholder="e.g. AI Model Governance Policy" className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] text-foreground mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-foreground">Category *</Label><Select><SelectTrigger className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] text-foreground mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-foreground">Framework *</Label><Select><SelectTrigger className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] text-foreground mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{frameworks.map(f=><SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-foreground">Owner</Label><Input placeholder="Policy owner" className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] text-foreground mt-1" /></div>
              <div><Label className="text-foreground">Risk Level</Label><Select><SelectTrigger className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] text-foreground mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{["Critical","High","Medium","Low"].map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label className="text-foreground">Scope</Label><Input placeholder="e.g. All AI systems" className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] text-foreground mt-1" /></div>
            <div><Label className="text-foreground">Description</Label><Textarea placeholder="Policy description..." className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] text-foreground mt-1" rows={3} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=>setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-[hsl(var(--brand))] hover:bg-primary/90" onClick={()=>{setDialogOpen(false);showToast("Policy created successfully as Draft");}}>Create Policy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
