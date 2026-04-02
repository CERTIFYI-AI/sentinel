import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileText, CheckCircle, Clock, XCircle, Search, Plus, Download, ChevronLeft, ChevronRight, Edit, Copy, Archive, Trash2, Eye, MoreVertical, Shield } from "lucide-react";

const COLORS = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#ec4899"];
const STATUS_MAP: Record<string,string> = { active:"bg-[hsl(var(--brand))]/20 text-[hsl(var(--brand))]", review:"bg-amber-500/20 text-amber-400", expired:"bg-red-500/20 text-red-400", draft:"bg-blue-500/20 text-blue-400", archived:"bg-zinc-500/20 text-[hsl(var(--text-3))]" };
const RISK_MAP: Record<string,string> = { High:"text-red-400 bg-red-500/20", Medium:"text-amber-400 bg-amber-500/20", Low:"text-[hsl(var(--brand))] bg-[hsl(var(--brand))]/20" };
const CATS = ["AI Usage","Data Privacy","Fairness","Security","Vendor Mgmt","Incident Response"];
const FWS = ["EU AI Act","NIST AI RMF","GDPR","ISO 27001","SOC 2","OWASP LLM"];
const OWNERS = ["Emma Wilson","Maria Santos","James Liu","Bob Kumar","Alice Chen","David Kim","Sarah Park","Raj Patel"];
const catData = [{name:"AI Usage",value:8},{name:"Data Privacy",value:6},{name:"Fairness",value:5},{name:"Security",value:4},{name:"Vendor Mgmt",value:4},{name:"Incident Response",value:4}];
const reviewData = [{month:"Oct",count:2},{month:"Nov",count:1},{month:"Dec",count:4},{month:"Jan",count:5},{month:"Feb",count:4},{month:"Mar",count:5}];

interface Policy { id:string; name:string; category:string; version:string; owner:string; updated:string; framework:string; status:string; description:string; scope:string; risk:string; created:string; lastReviewed:string; nextReview:string; approver:string; versions:{ver:string;date:string;author:string;summary:string;current:boolean}[]; controls:{id:string;name:string;status:string;score:number}[]; }

const policies: Policy[] = [
  {id:"POL-001",name:"Acceptable AI Use Policy",category:"AI Usage",version:"v3.2",owner:"Emma Wilson",updated:"2026-02-15",framework:"EU AI Act",status:"active",description:"Establishes guidelines for responsible AI usage across the organization, covering permitted and prohibited use cases for all AI and ML systems.",scope:"All employees, contractors, and third parties using AI systems",risk:"High",created:"2024-03-01",lastReviewed:"2026-02-15",nextReview:"2026-05-15",approver:"Dr. Sarah Mitchell",versions:[{ver:"v3.2",date:"2026-02-15",author:"Emma Wilson",summary:"Added generative AI usage guidelines",current:true},{ver:"v3.1",date:"2025-11-10",author:"Emma Wilson",summary:"Updated risk classification tiers",current:false},{ver:"v3.0",date:"2025-08-01",author:"James Liu",summary:"Major revision for EU AI Act alignment",current:false}],controls:[{id:"CTRL-001",name:"AI Usage Monitoring",status:"implemented",score:92},{id:"CTRL-002",name:"Prohibited Use Case Registry",status:"implemented",score:88},{id:"CTRL-015",name:"AI Ethics Review Board",status:"partial",score:75}]},
  {id:"POL-002",name:"AI Model Risk Classification Standard",category:"AI Usage",version:"v2.1",owner:"Maria Santos",updated:"2026-01-20",framework:"NIST AI RMF",status:"active",description:"Framework for classifying AI models by risk tier based on impact scope, autonomy level, and data sensitivity.",scope:"All AI/ML models in production and R&D prototypes",risk:"High",created:"2024-06-15",lastReviewed:"2026-01-20",nextReview:"2026-04-20",approver:"Dr. Sarah Mitchell",versions:[{ver:"v2.1",date:"2026-01-20",author:"Maria Santos",summary:"Added LLM-specific risk categories",current:true},{ver:"v2.0",date:"2025-09-01",author:"Maria Santos",summary:"Aligned with NIST AI RMF 1.0",current:false}],controls:[{id:"CTRL-003",name:"Model Risk Scoring",status:"implemented",score:95},{id:"CTRL-004",name:"Tier Review Workflow",status:"implemented",score:90}]},
  {id:"POL-003",name:"Data Retention & Deletion Policy",category:"Data Privacy",version:"v4.0",owner:"James Liu",updated:"2025-12-10",framework:"GDPR",status:"active",description:"Standards for data retention schedules, secure deletion procedures, and right-to-erasure compliance for AI training data.",scope:"All data stores containing personal or sensitive data",risk:"High",created:"2023-11-01",lastReviewed:"2025-12-10",nextReview:"2026-03-10",approver:"Legal Dept.",versions:[{ver:"v4.0",date:"2025-12-10",author:"James Liu",summary:"Added AI training data retention limits",current:true}],controls:[{id:"CTRL-005",name:"Data Lifecycle Tracking",status:"implemented",score:87},{id:"CTRL-006",name:"Automated Deletion Jobs",status:"implemented",score:94}]},
  {id:"POL-004",name:"Third-Party AI Vendor Assessment Protocol",category:"Vendor Mgmt",version:"v1.5",owner:"Bob Kumar",updated:"2026-03-01",framework:"ISO 27001",status:"active",description:"Due diligence and ongoing monitoring requirements for third-party AI vendors and API integrations.",scope:"All third-party AI/ML service providers",risk:"Medium",created:"2025-01-15",lastReviewed:"2026-03-01",nextReview:"2026-06-01",approver:"Procurement Lead",versions:[{ver:"v1.5",date:"2026-03-01",author:"Bob Kumar",summary:"Added SLA monitoring requirements",current:true}],controls:[{id:"CTRL-007",name:"Vendor Security Scorecard",status:"implemented",score:82},{id:"CTRL-008",name:"Annual Vendor Review",status:"partial",score:68}]},
  {id:"POL-005",name:"Incident Response Playbook for AI Failures",category:"Incident Response",version:"v2.0",owner:"Alice Chen",updated:"2025-11-20",framework:"SOC 2",status:"active",description:"Procedures for detecting, reporting, escalating, and remediating AI system failures and bias incidents.",scope:"All production AI systems",risk:"High",created:"2024-08-01",lastReviewed:"2025-11-20",nextReview:"2026-02-20",approver:"CISO Office",versions:[{ver:"v2.0",date:"2025-11-20",author:"Alice Chen",summary:"Added LLM hallucination response procedures",current:true}],controls:[{id:"CTRL-009",name:"Incident Detection Alerts",status:"implemented",score:89},{id:"CTRL-010",name:"Escalation Matrix",status:"implemented",score:93}]},
  {id:"POL-006",name:"Bias Testing & Fairness Standard",category:"Fairness",version:"v1.3",owner:"Maria Santos",updated:"2026-03-10",framework:"EU AI Act",status:"review",description:"Requirements for bias testing across protected attributes before and after model deployment.",scope:"All customer-facing AI models",risk:"High",created:"2025-02-01",lastReviewed:"2026-01-10",nextReview:"2026-04-10",approver:"Ethics Board",versions:[{ver:"v1.3",date:"2026-03-10",author:"Maria Santos",summary:"Added intersectional bias testing",current:true}],controls:[{id:"CTRL-011",name:"Bias Audit Pipeline",status:"partial",score:72},{id:"CTRL-012",name:"Fairness Metrics Dashboard",status:"implemented",score:85}]},
  {id:"POL-007",name:"Human Oversight Requirements for High-Risk AI",category:"AI Usage",version:"v1.0",owner:"Emma Wilson",updated:"2026-02-28",framework:"EU AI Act",status:"review",description:"Defines human-in-the-loop requirements for high-risk AI systems per EU AI Act Article 14.",scope:"All high-risk AI systems as classified by POL-002",risk:"High",created:"2025-12-01",lastReviewed:"2026-02-28",nextReview:"2026-05-28",approver:"Dr. Sarah Mitchell",versions:[{ver:"v1.0",date:"2026-02-28",author:"Emma Wilson",summary:"Initial release",current:true}],controls:[{id:"CTRL-013",name:"HITL Workflow Engine",status:"partial",score:60}]},
  {id:"POL-008",name:"LLM Prompt Injection Prevention Guide",category:"Security",version:"v1.1",owner:"David Kim",updated:"2025-08-15",framework:"OWASP LLM",status:"expired",description:"Security controls for preventing prompt injection, jailbreak, and data exfiltration attacks on LLM systems.",scope:"All deployed LLM-based applications",risk:"High",created:"2025-03-01",lastReviewed:"2025-08-15",nextReview:"2025-11-15",approver:"Security Lead",versions:[{ver:"v1.1",date:"2025-08-15",author:"David Kim",summary:"Added indirect injection patterns",current:true}],controls:[{id:"CTRL-014",name:"Input Sanitization Layer",status:"implemented",score:91}]},
  {id:"POL-009",name:"AI Training Data Governance Standard",category:"Data Privacy",version:"v2.3",owner:"Sarah Park",updated:"2026-03-05",framework:"NIST AI RMF",status:"active",description:"Standards for sourcing, labeling, validating, and documenting AI training datasets.",scope:"All AI model training pipelines",risk:"Medium",created:"2024-09-01",lastReviewed:"2026-03-05",nextReview:"2026-06-05",approver:"Data Governance Board",versions:[{ver:"v2.3",date:"2026-03-05",author:"Sarah Park",summary:"Added synthetic data guidelines",current:true}],controls:[{id:"CTRL-020",name:"Data Provenance Tracking",status:"implemented",score:88}]},
  {id:"POL-010",name:"Automated Decision-Making Transparency Policy",category:"Fairness",version:"v1.8",owner:"James Liu",updated:"2026-01-15",framework:"EU AI Act",status:"active",description:"Requirements for explainability, transparency notices, and right to human review of automated decisions.",scope:"All AI systems making decisions affecting individuals",risk:"High",created:"2025-03-15",lastReviewed:"2026-01-15",nextReview:"2026-04-15",approver:"Legal Dept.",versions:[{ver:"v1.8",date:"2026-01-15",author:"James Liu",summary:"Added SHAP explanation requirements",current:true}],controls:[{id:"CTRL-021",name:"Explainability Module",status:"implemented",score:80}]},
  {id:"POL-011",name:"AI Model Monitoring & Drift Detection Policy",category:"AI Usage",version:"v1.2",owner:"Raj Patel",updated:"2025-10-20",framework:"NIST AI RMF",status:"draft",description:"Requirements for continuous monitoring of model performance, data drift, and concept drift in production.",scope:"All production AI/ML models",risk:"Medium",created:"2025-07-01",lastReviewed:"2025-10-20",nextReview:"2026-01-20",approver:"ML Ops Lead",versions:[{ver:"v1.2",date:"2025-10-20",author:"Raj Patel",summary:"Added drift threshold configs",current:true}],controls:[{id:"CTRL-023",name:"Drift Detection Pipeline",status:"planned",score:0}]},
  {id:"POL-012",name:"Cross-Border AI Data Transfer Standard",category:"Data Privacy",version:"v0.9",owner:"Emma Wilson",updated:"2025-09-01",framework:"GDPR",status:"archived",description:"Requirements for transferring AI training and inference data across jurisdictional boundaries.",scope:"All cross-border data flows involving AI systems",risk:"High",created:"2025-04-01",lastReviewed:"2025-09-01",nextReview:"N/A",approver:"Legal Dept.",versions:[{ver:"v0.9",date:"2025-09-01",author:"Emma Wilson",summary:"Superseded by POL-003 v4.0",current:true}],controls:[{id:"CTRL-024",name:"Transfer Impact Assessment",status:"implemented",score:76}]},
];

const PER_PAGE = 6;
export default function PolicyManagement() {
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fwFilter, setFwFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Policy|null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editPolicy, setEditPolicy] = useState<Policy|null>(null);
  const [actionMenu, setActionMenu] = useState<string|null>(null);
  const [exportMenu, setExportMenu] = useState(false);
  const [form, setForm] = useState({name:"",category:"AI Usage",framework:"EU AI Act",owner:"Emma Wilson",status:"draft",scope:"",description:"",risk:"Medium",reviewFreq:"Quarterly"});

  const filtered = useMemo(() => policies.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.owner.toLowerCase().includes(q) || p.framework.toLowerCase().includes(q);
    const matchCat = catFilter === "all" || p.category === catFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchFw = fwFilter === "all" || p.framework === fwFilter;
    return matchSearch && matchCat && matchStatus && matchFw;
  }), [search, catFilter, statusFilter, fwFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const stats = [{label:"Total Policies",value:policies.length,icon:"FileText",color:"text-blue-400"},{label:"Active",value:policies.filter(p=>p.status==="active").length,icon:"CheckCircle",color:"text-[hsl(var(--brand))]"},{label:"Under Review",value:policies.filter(p=>p.status==="review").length,icon:"Clock",color:"text-amber-400"},{label:"Expired",value:policies.filter(p=>p.status==="expired").length,icon:"XCircle",color:"text-red-400"}];
  const iconMap: Record<string,any> = {FileText,CheckCircle,Clock,XCircle};

  const openCreate = () => { setForm({name:"",category:"AI Usage",framework:"EU AI Act",owner:"Emma Wilson",status:"draft",scope:"",description:"",risk:"Medium",reviewFreq:"Quarterly"}); setEditPolicy(null); setShowCreate(true); };
  const openEdit = (p: Policy) => { setForm({name:p.name,category:p.category,framework:p.framework,owner:p.owner,status:p.status,scope:p.scope,description:p.description,risk:p.risk,reviewFreq:"Quarterly"}); setEditPolicy(p); setShowCreate(true); };
  const doExport = (fmt: string) => { setExportMenu(false); const blob = new Blob([JSON.stringify(filtered,null,2)],{type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `policies.${fmt}`; a.click(); };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Policy Manager</h1>
          <p className="text-[hsl(var(--text-3))] text-sm">Manage AI governance policies, standards, and procedures</p>
        </div>
        <div className="flex gap-2 relative">
          <div className="relative">
            <Button variant="outline" className="border-[hsl(var(--border-mid))] text-[hsl(var(--text-2))]" onClick={() => setExportMenu(!exportMenu)}><Download className="w-4 h-4 mr-2"/>Export</Button>
            {exportMenu && <div className="absolute right-0 top-10 z-50 bg-[#1a1a2e] border border-[hsl(var(--border-mid))] rounded-lg shadow-xl py-1 w-32">{["csv","pdf","json"].map(f=><button key={f} className="w-full text-left px-3 py-2 text-sm text-[hsl(var(--text-2))] hover:bg-zinc-700" onClick={()=>doExport(f)}>{f.toUpperCase()}</button>)}</div>}
          </div>
          <Button className="bg-[hsl(var(--brand))] hover:bg-emerald-700 text-white" onClick={openCreate}><Plus className="w-4 h-4 mr-2"/>New Policy</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s,i) => { const Icon = iconMap[s.icon]; return (
          <Card key={i} className="bg-[#1a1a2e] border-[hsl(var(--border))] p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-[hsl(var(--text-3))] text-xs">{s.label}</p><p className="text-2xl font-bold text-white mt-1">{s.value}</p></div>
              <Icon className={`w-8 h-8 ${s.color} opacity-80`}/>
            </div>
          </Card>
        );})}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-[#1a1a2e] border-[hsl(var(--border))] p-4">
          <h3 className="text-white font-semibold mb-4">Policies by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({name,value})=>`${name}: ${value}`}>{catData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={{background:"#1a1a2e",border:"1px solid #333",borderRadius:8}}/><Legend/></PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="bg-[#1a1a2e] border-[hsl(var(--border))] p-4">
          <h3 className="text-white font-semibold mb-4">Policy Reviews (6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={reviewData}><CartesianGrid strokeDasharray="3 3" stroke="#333"/><XAxis dataKey="month" stroke="#888"/><YAxis stroke="#888"/><Tooltip contentStyle={{background:"#1a1a2e",border:"1px solid #333",borderRadius:8}}/><Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{fill:"#10b981"}}/></LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-[hsl(var(--text-4))]"/><Input placeholder="Search policies..." className="pl-10 bg-[#1a1a2e] border-[hsl(var(--border-mid))] text-white" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div>
        <select className="bg-[#1a1a2e] border border-[hsl(var(--border-mid))] rounded-md px-3 py-2 text-sm text-[hsl(var(--text-2))]" value={catFilter} onChange={e=>{setCatFilter(e.target.value);setPage(1);}}><option value="all">All Categories</option>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <select className="bg-[#1a1a2e] border border-[hsl(var(--border-mid))] rounded-md px-3 py-2 text-sm text-[hsl(var(--text-2))]" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}><option value="all">All Status</option><option value="active">Active</option><option value="review">Under Review</option><option value="expired">Expired</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
        <select className="bg-[#1a1a2e] border border-[hsl(var(--border-mid))] rounded-md px-3 py-2 text-sm text-[hsl(var(--text-2))]" value={fwFilter} onChange={e=>{setFwFilter(e.target.value);setPage(1);}}><option value="all">All Frameworks</option>{FWS.map(f=><option key={f} value={f}>{f}</option>)}</select>
      </div>

      {/* Table */}
      <Card className="bg-[#1a1a2e] border-[hsl(var(--border))]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[hsl(var(--border))]">{["ID","Name","Category","Version","Owner","Updated","Framework","Status","Actions"].map(h=><th key={h} className="px-4 py-3 text-left text-[hsl(var(--text-3))] font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {paged.map(p=>(
                <tr key={p.id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--bg-raised))]/30 cursor-pointer" onClick={()=>setSel(p)}>
                  <td className="px-4 py-3 text-[hsl(var(--text-2))] font-mono text-xs">{p.id}</td>
                  <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-[hsl(var(--text-2))]">{p.category}</td>
                  <td className="px-4 py-3 text-[hsl(var(--text-2))]">{p.version}</td>
                  <td className="px-4 py-3 text-[hsl(var(--text-2))]">{p.owner}</td>
                  <td className="px-4 py-3 text-[hsl(var(--text-3))] text-xs">{p.updated}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs border-zinc-600 text-[hsl(var(--text-2))]">{p.framework}</Badge></td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_MAP[p.status]||""}`}>{p.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button className="p-1 hover:bg-zinc-700 rounded" onClick={e=>{e.stopPropagation();setActionMenu(actionMenu===p.id?null:p.id);}}><MoreVertical className="w-4 h-4 text-[hsl(var(--text-3))]"/></button>
                      {actionMenu===p.id&&<div className="absolute right-0 top-8 z-50 bg-[#1a1a2e] border border-[hsl(var(--border-mid))] rounded-lg shadow-xl py-1 w-36">
                        <button className="w-full text-left px-3 py-2 text-sm text-[hsl(var(--text-2))] hover:bg-zinc-700 flex items-center gap-2" onClick={e=>{e.stopPropagation();setActionMenu(null);setSel(p);}}><Eye className="w-3 h-3"/>View</button>
                        <button className="w-full text-left px-3 py-2 text-sm text-[hsl(var(--text-2))] hover:bg-zinc-700 flex items-center gap-2" onClick={e=>{e.stopPropagation();setActionMenu(null);openEdit(p);}}><Edit className="w-3 h-3"/>Edit</button>
                        <button className="w-full text-left px-3 py-2 text-sm text-[hsl(var(--text-2))] hover:bg-zinc-700 flex items-center gap-2" onClick={e=>{e.stopPropagation();setActionMenu(null);nav(`/policy-editor?id=${p.id}`);}}><Eye className="w-3 h-3"/>Open Editor</button>
                        <button className="w-full text-left px-3 py-2 text-sm text-[hsl(var(--text-2))] hover:bg-zinc-700 flex items-center gap-2" onClick={e=>{e.stopPropagation();setActionMenu(null);}}><Copy className="w-3 h-3"/>Clone</button>
                        <button className="w-full text-left px-3 py-2 text-sm text-[hsl(var(--text-2))] hover:bg-zinc-700 flex items-center gap-2" onClick={e=>{e.stopPropagation();setActionMenu(null);}}><Archive className="w-3 h-3"/>Archive</button>
                        <button className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2" onClick={e=>{e.stopPropagation();setActionMenu(null);}}><Trash2 className="w-3 h-3"/>Delete</button>
                      </div>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))]">
          <span className="text-[hsl(var(--text-3))] text-sm">Showing {(page-1)*PER_PAGE+1}-{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="border-[hsl(var(--border-mid))] text-[hsl(var(--text-3))]" disabled={page<=1} onClick={()=>setPage(page-1)}><ChevronLeft className="w-4 h-4"/></Button>
            {Array.from({length:totalPages},(_,i)=><Button key={i} variant={page===i+1?"default":"outline"} size="sm" className={page===i+1?"bg-[hsl(var(--brand))] text-white":"border-[hsl(var(--border-mid))] text-[hsl(var(--text-3))]"} onClick={()=>setPage(i+1)}>{i+1}</Button>)}
            <Button variant="outline" size="sm" className="border-[hsl(var(--border-mid))] text-[hsl(var(--text-3))]" disabled={page>=totalPages} onClick={()=>setPage(page+1)}><ChevronRight className="w-4 h-4"/></Button>
          </div>
        </div>
      </Card>

      {/* Side Sheet */}
      <Sheet open={!!sel && !showCreate} onOpenChange={()=>setSel(null)}>
        <SheetContent className="bg-[#1a1a2e] border-[hsl(var(--border))] w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader><SheetTitle className="text-white">{sel?.name}</SheetTitle></SheetHeader>
          {sel && <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="bg-[hsl(var(--bg-raised))]/50 w-full"><TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger><TabsTrigger value="versions" className="flex-1">Versions</TabsTrigger><TabsTrigger value="controls" className="flex-1">Controls</TabsTrigger></TabsList>
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                {[["Category",sel.category],["Version",sel.version],["Owner",sel.owner],["Framework",sel.framework],["Status",sel.status],["Risk Level",sel.risk],["Created",sel.created],["Last Reviewed",sel.lastReviewed],["Next Review",sel.nextReview],["Approver",sel.approver]].map(([k,v],i)=>(
                  <div key={i} className="bg-[hsl(var(--bg-raised))]/30 rounded-lg p-3"><p className="text-[hsl(var(--text-4))] text-xs">{k}</p><p className="text-white text-sm mt-1">{v}</p></div>
                ))}
              </div>
              <Separator className="bg-zinc-700"/>
              <div><h4 className="text-[hsl(var(--text-3))] text-xs font-medium mb-1">Description</h4><p className="text-[hsl(var(--text-2))] text-sm">{sel.description}</p></div>
              <div><h4 className="text-[hsl(var(--text-3))] text-xs font-medium mb-1">Scope</h4><p className="text-[hsl(var(--text-2))] text-sm">{sel.scope}</p></div>
              <div className="flex gap-2 mt-4">
                <Button className="bg-[hsl(var(--brand))] hover:bg-emerald-700 text-white flex-1" onClick={()=>{setSel(null);openEdit(sel);}}>Edit Policy</Button>
                <Button variant="outline" className="border-[hsl(var(--border-mid))] text-[hsl(var(--text-2))] flex-1" onClick={()=>nav(`/policy-editor?id=${sel.id}`)}>Open Editor</Button>
              </div>
            </TabsContent>
            <TabsContent value="versions" className="space-y-3 mt-4">
              {sel.versions.map((v,i)=>(
                <div key={i} className="bg-[hsl(var(--bg-raised))]/30 rounded-lg p-3 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${v.current?"bg-[hsl(var(--brand))]":"bg-zinc-600"}`}/>
                  <div className="flex-1">
                    <div className="flex items-center justify-between"><span className="text-white text-sm font-medium">{v.ver}</span>{v.current&&<Badge className="bg-[hsl(var(--brand))]/20 text-[hsl(var(--brand))] text-xs">Current</Badge>}</div>
                    <p className="text-[hsl(var(--text-3))] text-xs mt-1">{v.date} by {v.author}</p>
                    <p className="text-[hsl(var(--text-2))] text-sm mt-1">{v.summary}</p>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="border-[hsl(var(--border-mid))] text-[hsl(var(--text-2))] w-full mt-2">Compare Versions</Button>
            </TabsContent>
            <TabsContent value="controls" className="space-y-3 mt-4">
              {sel.controls.map((c,i)=>(
                <div key={i} className="bg-[hsl(var(--bg-raised))]/30 rounded-lg p-3">
                  <div className="flex items-center justify-between"><span className="text-white text-sm">{c.id}</span><span className={`px-2 py-0.5 rounded text-xs ${c.status==="implemented"?"bg-[hsl(var(--brand))]/20 text-[hsl(var(--brand))]":c.status==="partial"?"bg-amber-500/20 text-amber-400":"bg-blue-500/20 text-blue-400"}`}>{c.status}</span></div>
                  <p className="text-[hsl(var(--text-2))] text-sm mt-1">{c.name}</p>
                  {c.score>0&&<div className="mt-2"><div className="flex justify-between text-xs text-[hsl(var(--text-3))] mb-1"><span>Effectiveness</span><span>{c.score}%</span></div><div className="w-full bg-zinc-700 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-[hsl(var(--brand))]" style={{width:`${c.score}%`}}/></div></div>}
                </div>
              ))}
              <Button variant="outline" className="border-[hsl(var(--border-mid))] text-[hsl(var(--text-2))] w-full mt-2"><Shield className="w-4 h-4 mr-2"/>Link Control</Button>
            </TabsContent>
          </Tabs>}
        </SheetContent>
      </Sheet>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#1a1a2e] border-[hsl(var(--border))] text-white max-w-lg">
          <DialogHeader><DialogTitle>{editPolicy?"Update Policy":"Create Policy"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-[hsl(var(--text-3))] text-xs">Policy Name</label><Input className="bg-[hsl(var(--bg-raised))] border-[hsl(var(--border-mid))] text-white mt-1" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[hsl(var(--text-3))] text-xs">Category</label><select className="w-full bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border-mid))] rounded-md px-3 py-2 text-sm text-white mt-1" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-[hsl(var(--text-3))] text-xs">Framework</label><select className="w-full bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border-mid))] rounded-md px-3 py-2 text-sm text-white mt-1" value={form.framework} onChange={e=>setForm({...form,framework:e.target.value})}>{FWS.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[hsl(var(--text-3))] text-xs">Owner</label><select className="w-full bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border-mid))] rounded-md px-3 py-2 text-sm text-white mt-1" value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})}>{OWNERS.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className="text-[hsl(var(--text-3))] text-xs">Risk Level</label><select className="w-full bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border-mid))] rounded-md px-3 py-2 text-sm text-white mt-1" value={form.risk} onChange={e=>setForm({...form,risk:e.target.value})}>{["High","Medium","Low"].map(r=><option key={r} value={r}>{r}</option>)}</select></div>
            </div>
            <div><label className="text-[hsl(var(--text-3))] text-xs">Scope</label><textarea className="w-full bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border-mid))] rounded-md px-3 py-2 text-sm text-white mt-1 h-16 resize-none" value={form.scope} onChange={e=>setForm({...form,scope:e.target.value})}/></div>
            <div><label className="text-[hsl(var(--text-3))] text-xs">Description</label><textarea className="w-full bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border-mid))] rounded-md px-3 py-2 text-sm text-white mt-1 h-20 resize-none" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" className="border-[hsl(var(--border-mid))] text-[hsl(var(--text-2))]" onClick={()=>setShowCreate(false)}>Cancel</Button><Button className="bg-[hsl(var(--brand))] hover:bg-emerald-700 text-white" onClick={()=>setShowCreate(false)}>{editPolicy?"Update":"Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
