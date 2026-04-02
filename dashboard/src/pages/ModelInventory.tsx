import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import { Brain, Eye, PencilSimple, Trash, Export, Plus, Warning, CheckCircle, Clock, XCircle, ShieldCheck, Funnel } from "@phosphor-icons/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const models = [
  { id:"MDL-001",name:"GPT-4-Turbo",version:"4.0.1",type:"LLM - Generative",owner:"Maria Santos",status:"Production" as const,riskTier:"High" as const,fairnessScore:87,driftStatus:"Stable" as const,lastValidated:"2025-03-15",framework:"EU AI Act",department:"Customer Service",description:"General-purpose LLM for customer support chatbot and document summarization.",accuracy:94.2,latencyMs:320,monthlyInferences:"2.4M",euAiActArticle:"Article 6 - High-Risk Classification",biasMetrics:[{metric:"Gender Parity",value:0.92,threshold:0.85,status:"Pass"},{metric:"Age Group Fairness",value:0.88,threshold:0.85,status:"Pass"},{metric:"Ethnic Disparity Index",value:0.79,threshold:0.85,status:"Fail"},{metric:"Socioeconomic Bias",value:0.91,threshold:0.85,status:"Pass"}],performanceHistory:[{month:"Oct",accuracy:93.1,latency:310},{month:"Nov",accuracy:93.8,latency:305},{month:"Dec",accuracy:94.0,latency:315},{month:"Jan",accuracy:94.1,latency:322},{month:"Feb",accuracy:94.2,latency:318},{month:"Mar",accuracy:94.2,latency:320}],guardrails:[{name:"PII Detection",enabled:true,threshold:"99.5% recall"},{name:"Toxicity Filter",enabled:true,threshold:"Score < 0.15"},{name:"Hallucination Guard",enabled:true,threshold:"Confidence > 0.8"},{name:"Prompt Injection Shield",enabled:true,threshold:"Block rate 100%"}],complianceMapping:[{framework:"EU AI Act",clause:"Art. 9 - Risk Management",status:"Compliant"},{framework:"EU AI Act",clause:"Art. 13 - Transparency",status:"Partial"},{framework:"ISO 27001",clause:"A.8.1 - Asset Management",status:"Compliant"},{framework:"NIST AI RMF",clause:"MAP 1.1 - Context",status:"Compliant"}],incidents:[{id:"INC-003",date:"2025-01-22",type:"Hallucination",severity:"Medium",resolved:true},{id:"INC-007",date:"2025-03-01",type:"PII Leak",severity:"High",resolved:false}]},
  { id:"MDL-002",name:"CreditScorer",version:"v2.1",type:"ML - Classification",owner:"David Kim",status:"Production" as const,riskTier:"High" as const,fairnessScore:72,driftStatus:"Warning" as const,lastValidated:"2025-02-28",framework:"NIST AI RMF",department:"Lending",description:"Credit risk scoring model for consumer loan applications. Subject to ECOA requirements.",accuracy:91.5,latencyMs:45,monthlyInferences:"890K",euAiActArticle:"Annex III, 5(b) - Creditworthiness",biasMetrics:[{metric:"Gender Parity",value:0.84,threshold:0.85,status:"Fail"},{metric:"Age Group Fairness",value:0.81,threshold:0.85,status:"Fail"},{metric:"Ethnic Disparity Index",value:0.76,threshold:0.85,status:"Fail"},{metric:"Socioeconomic Bias",value:0.88,threshold:0.85,status:"Pass"}],performanceHistory:[{month:"Oct",accuracy:92.0,latency:42},{month:"Nov",accuracy:91.8,latency:44},{month:"Dec",accuracy:91.6,latency:43},{month:"Jan",accuracy:91.4,latency:45},{month:"Feb",accuracy:91.3,latency:46},{month:"Mar",accuracy:91.5,latency:45}],guardrails:[{name:"Adverse Action Explainer",enabled:true,threshold:"SHAP > 0.01"},{name:"Protected Class Monitor",enabled:true,threshold:"DI Ratio > 0.8"},{name:"Score Band Validator",enabled:true,threshold:"300-850 range"}],complianceMapping:[{framework:"EU AI Act",clause:"Annex III, 5(b) - Credit",status:"Review"},{framework:"NIST AI RMF",clause:"MEASURE 2.6 - Bias",status:"Partial"},{framework:"SOC 2",clause:"CC6.1 - Logical Access",status:"Compliant"}],incidents:[{id:"INC-001",date:"2025-02-14",type:"Bias Violation",severity:"Critical",resolved:false}]},
  { id:"MDL-003",name:"Claude-3-Sonnet",version:"3.0",type:"LLM - Generative",owner:"Maria Santos",status:"Staging" as const,riskTier:"Limited" as const,fairnessScore:91,driftStatus:"Stable" as const,lastValidated:"2025-03-10",framework:"EU AI Act",department:"Legal",description:"LLM for contract analysis and regulatory document summarization.",accuracy:96.1,latencyMs:280,monthlyInferences:"120K",euAiActArticle:"Article 52 - Transparency for AI Systems",biasMetrics:[{metric:"Gender Parity",value:0.95,threshold:0.85,status:"Pass"},{metric:"Age Group Fairness",value:0.93,threshold:0.85,status:"Pass"},{metric:"Ethnic Disparity Index",value:0.90,threshold:0.85,status:"Pass"},{metric:"Socioeconomic Bias",value:0.94,threshold:0.85,status:"Pass"}],performanceHistory:[{month:"Oct",accuracy:95.5,latency:290},{month:"Nov",accuracy:95.8,latency:285},{month:"Dec",accuracy:95.9,latency:282},{month:"Jan",accuracy:96.0,latency:280},{month:"Feb",accuracy:96.1,latency:278},{month:"Mar",accuracy:96.1,latency:280}],guardrails:[{name:"Legal Citation Validator",enabled:true,threshold:"Accuracy > 95%"},{name:"Confidentiality Guard",enabled:true,threshold:"Block rate 100%"}],complianceMapping:[{framework:"EU AI Act",clause:"Art. 52 - Transparency",status:"Compliant"},{framework:"GDPR",clause:"Art. 22 - Automated Decisions",status:"Compliant"}],incidents:[]},
  { id:"MDL-004",name:"FraudDetector",version:"v3.0",type:"ML - Anomaly Detection",owner:"David Kim",status:"Production" as const,riskTier:"High" as const,fairnessScore:83,driftStatus:"Critical" as const,lastValidated:"2025-01-20",framework:"SOC 2",department:"Fraud Prevention",description:"Real-time transaction fraud detection for payment processing.",accuracy:97.8,latencyMs:12,monthlyInferences:"15.2M",euAiActArticle:"Annex III, 5(a) - Credit Institutions",biasMetrics:[{metric:"Gender Parity",value:0.89,threshold:0.85,status:"Pass"},{metric:"Age Group Fairness",value:0.86,threshold:0.85,status:"Pass"},{metric:"Geographic Fairness",value:0.78,threshold:0.85,status:"Fail"},{metric:"Transaction Size Bias",value:0.91,threshold:0.85,status:"Pass"}],performanceHistory:[{month:"Oct",accuracy:98.1,latency:11},{month:"Nov",accuracy:98.0,latency:12},{month:"Dec",accuracy:97.9,latency:12},{month:"Jan",accuracy:97.8,latency:13},{month:"Feb",accuracy:97.6,latency:14},{month:"Mar",accuracy:97.3,latency:15}],guardrails:[{name:"False Positive Limiter",enabled:true,threshold:"FPR < 2%"},{name:"Amount Threshold",enabled:true,threshold:"> $50 transactions"}],complianceMapping:[{framework:"SOC 2",clause:"CC6.6 - System Operations",status:"Compliant"},{framework:"NIST AI RMF",clause:"MEASURE 1.1 - Accuracy",status:"Review"}],incidents:[{id:"INC-005",date:"2025-03-08",type:"Model Drift",severity:"High",resolved:false}]},
  { id:"MDL-005",name:"Llama-3-70B",version:"3.0",type:"LLM - Open Source",owner:"Maria Santos",status:"Development" as const,riskTier:"Limited" as const,fairnessScore:85,driftStatus:"Stable" as const,lastValidated:"2025-03-01",framework:"OWASP LLM",department:"Engineering",description:"Open-source LLM for internal code review and documentation generation.",accuracy:89.5,latencyMs:450,monthlyInferences:"45K",euAiActArticle:"Article 28 - Obligations of Providers of GPAI",biasMetrics:[{metric:"Gender Parity",value:0.87,threshold:0.85,status:"Pass"},{metric:"Code Language Bias",value:0.92,threshold:0.85,status:"Pass"}],performanceHistory:[{month:"Oct",accuracy:88.0,latency:470},{month:"Nov",accuracy:88.5,latency:460},{month:"Dec",accuracy:89.0,latency:455},{month:"Jan",accuracy:89.2,latency:452},{month:"Feb",accuracy:89.4,latency:450},{month:"Mar",accuracy:89.5,latency:450}],guardrails:[{name:"Code Injection Detector",enabled:true,threshold:"Block rate 99.9%"},{name:"License Compliance",enabled:true,threshold:"Apache 2.0 only"}],complianceMapping:[{framework:"OWASP LLM",clause:"LLM01 - Prompt Injection",status:"Compliant"},{framework:"OWASP LLM",clause:"LLM06 - Sensitive Info",status:"Partial"}],incidents:[]},
  { id:"MDL-006",name:"MedicalTriage",version:"v1.2",type:"ML - NLP Classification",owner:"Emma Wilson",status:"Retired" as const,riskTier:"Unacceptable" as const,fairnessScore:68,driftStatus:"Critical" as const,lastValidated:"2024-11-15",framework:"EU AI Act",department:"Health Benefits",description:"Employee health claim triage system. RETIRED due to EU AI Act Article 5 concerns.",accuracy:88.2,latencyMs:95,monthlyInferences:"0",euAiActArticle:"Article 5 - Prohibited AI Practices",biasMetrics:[{metric:"Gender Parity",value:0.72,threshold:0.85,status:"Fail"},{metric:"Age Group Fairness",value:0.65,threshold:0.85,status:"Fail"},{metric:"Disability Bias",value:0.58,threshold:0.85,status:"Fail"}],performanceHistory:[{month:"Jun",accuracy:89.0,latency:90},{month:"Jul",accuracy:88.8,latency:92},{month:"Aug",accuracy:88.5,latency:93},{month:"Sep",accuracy:88.3,latency:94},{month:"Oct",accuracy:88.2,latency:95},{month:"Nov",accuracy:88.2,latency:95}],guardrails:[{name:"All Guardrails",enabled:false,threshold:"DISABLED - Model Retired"}],complianceMapping:[{framework:"EU AI Act",clause:"Art. 5 - Prohibited",status:"Non-Compliant"},{framework:"GDPR",clause:"Art. 9 - Special Categories",status:"Non-Compliant"}],incidents:[{id:"INC-002",date:"2024-10-30",type:"Bias Violation",severity:"Critical",resolved:true},{id:"INC-004",date:"2024-11-10",type:"Regulatory Flag",severity:"Critical",resolved:true}]}
];


const statusColor = (s: string) => s==="Production"?"bg-emerald-50 text-emerald-700 border border-emerald-200":s==="Staging"?"bg-amber-50 text-amber-700 border border-amber-200":s==="Development"?"bg-blue-50 text-blue-700 border border-blue-200":"bg-red-50 text-red-700 border border-red-200";
const riskColor = (r: string) => r==="High"?"bg-red-50 text-red-700 border border-red-200":r==="Unacceptable"?"bg-red-100 text-red-800 border border-red-300":r==="Limited"?"bg-amber-50 text-amber-700 border border-amber-200":"bg-emerald-50 text-emerald-700 border border-emerald-200";
const driftColor = (d: string) => d==="Stable"?"text-emerald-600":d==="Warning"?"text-amber-600":"text-red-600 animate-pulse";
const compColor = (s: string) => s==="Compliant"?"bg-emerald-50 text-emerald-700":s==="Partial"?"bg-amber-50 text-amber-700":s==="Review"?"bg-blue-50 text-blue-700":"bg-red-50 text-red-700";

export default function ModelInventory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [selected, setSelected] = useState<typeof models[0]|null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = models.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase()) || m.owner.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter==="all" || m.status===statusFilter;
    const matchRisk = riskFilter==="all" || m.riskTier===riskFilter;
    return matchSearch && matchStatus && matchRisk;
  });

  const stats = [
    { label: "Total Models", value: models.length, icon: Brain, color: "text-slate-700" },
    { label: "In Production", value: models.filter(m=>m.status==="Production").length, icon: CheckCircle, color: "text-emerald-600" },
    { label: "Drift Alerts", value: models.filter(m=>m.driftStatus!=="Stable").length, icon: Warning, color: "text-amber-600" },
    { label: "High Risk", value: models.filter(m=>m.riskTier==="High"||m.riskTier==="Unacceptable").length, icon: XCircle, color: "text-red-600" },
  ];

  const openDrawer = (m: typeof models[0]) => { setSelected(m); setDrawerOpen(true); };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Model Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Acme Financial Corp AI/ML model registry with EU AI Act compliance tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" style={{borderRadius:0}}><Export weight="regular" className="h-4 w-4 mr-1"/>Export</Button>
          <Button size="sm" className="bg-[#368F4D] hover:bg-emerald-700" style={{borderRadius:0}}><Plus weight="bold" className="h-4 w-4 mr-1"/>Register Model</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s,i)=>(
          <Card key={i} style={{borderRadius:0}}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
                  <p className="text-2xl font-semibold mt-1">{s.value}</p>
                </div>
                <s.icon weight="duotone" className={`h-8 w-8 ${s.color}`}/>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card style={{borderRadius:0}}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Input placeholder="Search models by name, ID, or owner..." value={search} onChange={(e)=>setSearch(e.target.value)} className="pl-9" style={{borderRadius:0}}/>
            </div>
            <div className="flex gap-2">
              <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="border px-3 py-1.5 text-sm bg-white" style={{borderRadius:0}}>
                <option value="all">All Status</option>
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Development">Development</option>
                <option value="Retired">Retired</option>
              </select>
              <select value={riskFilter} onChange={(e)=>setRiskFilter(e.target.value)} className="border px-3 py-1.5 text-sm bg-white" style={{borderRadius:0}}>
                <option value="all">All Risk Tiers</option>
                <option value="High">High</option>
                <option value="Limited">Limited</option>
                <option value="Minimal">Minimal</option>
                <option value="Unacceptable">Unacceptable</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Model ID</th>
                  <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Name</th>
                  <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Risk Tier</th>
                  <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Fairness</th>
                  <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Drift</th>
                  <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Owner</th>
                  <th className="text-left p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m=>(
                  <tr key={m.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={()=>openDrawer(m)}>
                    <td className="p-3 text-sm font-mono text-slate-600">{m.id}</td>
                    <td className="p-3"><div className="text-sm font-medium text-slate-900">{m.name}</div><div className="text-xs text-slate-500">{m.version}</div></td>
                    <td className="p-3 text-sm text-slate-600">{m.type}</td>
                    <td className="p-3"><Badge className={statusColor(m.status)} style={{borderRadius:0}}>{m.status}</Badge></td>
                    <td className="p-3"><Badge className={riskColor(m.riskTier)} style={{borderRadius:0}}>{m.riskTier}</Badge></td>
                    <td className="p-3"><div className="flex items-center gap-2"><Progress value={m.fairnessScore} className="w-16 h-2" style={{borderRadius:0}}/><span className="text-sm text-slate-600">{m.fairnessScore}%</span></div></td>
                    <td className="p-3"><span className={`text-sm font-medium ${driftColor(m.driftStatus)}`}>{m.driftStatus}</span></td>
                    <td className="p-3 text-sm text-slate-600">{m.owner}</td>
                    <td className="p-3"><div className="flex gap-1"><button onClick={(e)=>{e.stopPropagation();openDrawer(m)}} className="p-1 hover:bg-slate-100"><Eye weight="regular" className="h-4 w-4 text-slate-500"/></button><button className="p-1 hover:bg-slate-100"><PencilSimple weight="regular" className="h-4 w-4 text-slate-500"/></button><button className="p-1 hover:bg-slate-100"><Trash weight="regular" className="h-4 w-4 text-red-500"/></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length===0 && <div className="p-12 text-center text-slate-500">No models match your search criteria.</div>}
          </div>
          <div className="p-3 border-t text-sm text-slate-500">Showing {filtered.length} of {models.length} models</div>
        </CardContent>
      </Card>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto" style={{borderRadius:0}}>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl font-semibold">{selected.name} <span className="text-sm font-normal text-slate-500">{selected.version}</span></SheetTitle>
                <p className="text-sm text-slate-500">{selected.id} | {selected.department} | Owner: {selected.owner}</p>
              </SheetHeader>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList style={{borderRadius:0}} className="w-full grid grid-cols-3">
                  <TabsTrigger value="overview" style={{borderRadius:0}}>Overview</TabsTrigger>
                  <TabsTrigger value="bias" style={{borderRadius:0}}>Bias & Fairness</TabsTrigger>
                  <TabsTrigger value="performance" style={{borderRadius:0}}>Performance</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</p><p className="text-sm">{selected.type}</p></div>
                    <div className="space-y-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</p><Badge className={statusColor(selected.status)} style={{borderRadius:0}}>{selected.status}</Badge></div>
                    <div className="space-y-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Risk Tier</p><Badge className={riskColor(selected.riskTier)} style={{borderRadius:0}}>{selected.riskTier}</Badge></div>
                    <div className="space-y-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">EU AI Act</p><p className="text-sm">{selected.euAiActArticle}</p></div>
                    <div className="space-y-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Accuracy</p><p className="text-sm font-medium">{selected.accuracy}%</p></div>
                    <div className="space-y-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Latency</p><p className="text-sm">{selected.latencyMs}ms</p></div>
                    <div className="space-y-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Monthly Inferences</p><p className="text-sm">{selected.monthlyInferences}</p></div>
                    <div className="space-y-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Last Validated</p><p className="text-sm">{selected.lastValidated}</p></div>
                  </div>
                  <div className="space-y-1"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Description</p><p className="text-sm text-slate-600">{selected.description}</p></div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Guardrail Configuration</p>
                    {selected.guardrails.map((g,i)=>(<div key={i} className="flex items-center justify-between p-2 border" style={{borderRadius:0}}><div className="flex items-center gap-2"><ShieldCheck weight={g.enabled?"fill":"regular"} className={g.enabled?"h-4 w-4 text-emerald-600":"h-4 w-4 text-slate-400"}/><span className="text-sm">{g.name}</span></div><span className="text-xs text-slate-500">{g.threshold}</span></div>))}
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Compliance Mapping</p>
                    {selected.complianceMapping.map((c,i)=>(<div key={i} className="flex items-center justify-between p-2 border" style={{borderRadius:0}}><div><span className="text-sm font-medium">{c.framework}</span><span className="text-xs text-slate-500 ml-2">{c.clause}</span></div><Badge className={compColor(c.status)} style={{borderRadius:0}}>{c.status}</Badge></div>))}
                  </div>
                  {selected.incidents.length>0 && <div className="space-y-2"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Incident History</p>{selected.incidents.map((inc,i)=>(<div key={i} className="flex items-center justify-between p-2 border" style={{borderRadius:0}}><div><span className="text-sm font-mono">{inc.id}</span><span className="text-xs text-slate-500 ml-2">{inc.date}</span><span className="text-xs text-slate-500 ml-2">{inc.type}</span></div><div className="flex items-center gap-2"><Badge className={inc.severity==="Critical"?"bg-red-50 text-red-700":inc.severity==="High"?"bg-amber-50 text-amber-700":"bg-blue-50 text-blue-700"} style={{borderRadius:0}}>{inc.severity}</Badge>{inc.resolved?<CheckCircle weight="fill" className="h-4 w-4 text-[hsl(var(--brand))]"/>:<Clock weight="fill" className="h-4 w-4 text-amber-500"/>}</div></div>))}</div>}
                </TabsContent>
                <TabsContent value="bias" className="mt-4 space-y-4">
                  <p className="text-sm text-slate-600">Fairness Score: <span className="font-semibold">{selected.fairnessScore}%</span></p>
                  <div className="space-y-3">
                    {selected.biasMetrics.map((b,i)=>(<div key={i} className="space-y-1"><div className="flex justify-between text-sm"><span>{b.metric}</span><span className={b.status==="Pass"?"text-emerald-600 font-medium":"text-red-600 font-medium"}>{b.value} / {b.threshold}</span></div><Progress value={b.value*100} className="h-2" style={{borderRadius:0}}/></div>))}
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={selected.biasMetrics.map(b=>({name:b.metric.split(" ")[0],value:b.value*100,threshold:b.threshold*100}))}>
                        <XAxis dataKey="name" fontSize={11}/>
                        <YAxis fontSize={11}/>
                        <RTooltip/>
                        <Bar dataKey="value" fill="#368F4D"/>
                        <Bar dataKey="threshold" fill="#e2e8f0"/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                <TabsContent value="performance" className="mt-4 space-y-4">
                  <div className="flex items-center gap-2"><span className={`text-sm font-medium ${driftColor(selected.driftStatus)}`}>Drift Status: {selected.driftStatus}</span></div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selected.performanceHistory}>
                        <CartesianGrid strokeDasharray="3 3"/>
                        <XAxis dataKey="month" fontSize={11}/>
                        <YAxis fontSize={11}/>
                        <RTooltip/>
                        <Line type="monotone" dataKey="accuracy" stroke="#368F4D" strokeWidth={2}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Latency Trend (ms)</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selected.performanceHistory}>
                        <CartesianGrid strokeDasharray="3 3"/>
                        <XAxis dataKey="month" fontSize={11}/>
                        <YAxis fontSize={11}/>
                        <RTooltip/>
                        <Line type="monotone" dataKey="latency" stroke="#f59e0b" strokeWidth={2}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
