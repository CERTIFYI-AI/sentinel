import{useState}from"react";import{Card,CardContent}from"../../components/ui/card";import{Badge}from"../../components/ui/badge";import{Button}from"../../components/ui/button";import{Input}from"../../components/ui/input";import{Search,Shield,AlertTriangle,CheckCircle,XCircle,Zap}from"lucide-react";
const logs=[{id:"GR-001",timestamp:"2026-03-15 14:23:01",agent:"ComplianceBot",rule:"PII Detection",input:"User shared SSN: 123-45-6789",action:"blocked",severity:"high",latency:"12ms"},{id:"GR-002",timestamp:"2026-03-15 14:21:44",agent:"SupportBot",rule:"Toxicity Filter",input:"Please help me with offensive content...",action:"warned",severity:"medium",latency:"8ms"},{id:"GR-003",timestamp:"2026-03-15 14:20:10",agent:"AnalyticsAI",rule:"Data Boundary",input:"Query customer PII from prod DB",action:"blocked",severity:"critical",latency:"5ms"},{id:"GR-004",timestamp:"2026-03-15 14:18:55",agent:"ReportBot",rule:"Output Validation",input:"Generate financial summary",action:"allowed",severity:"low",latency:"3ms"},{id:"GR-005",timestamp:"2026-03-15 14:17:30",agent:"LegalDraft",rule:"Hallucination Check",input:"Summarize case law",action:"flagged",severity:"medium",latency:"22ms"},{id:"GR-006",timestamp:"2026-03-15 14:15:12",agent:"ComplianceBot",rule:"Prompt Injection",input:"Ignore previous instructions...",action:"blocked",severity:"critical",latency:"4ms"}];
const ac:Record<string,string>={blocked:"bg-red-500/20 text-red-400",warned:"bg-yellow-500/20 text-yellow-400",flagged:"bg-orange-500/20 text-orange-400",allowed:"bg-green-500/20 text-green-400"};
const sv:Record<string,string>={critical:"bg-red-500/20 text-red-400",high:"bg-orange-500/20 text-orange-400",medium:"bg-yellow-500/20 text-yellow-400",low:"bg-green-500/20 text-green-400"};
export default function GuardrailActivity(){
  const[search,setSearch]=useState("");const[filter,setFilter]=useState("all");
  const filtered=logs.filter(l=>(filter==="all"||l.action===filter)&&(l.agent.toLowerCase().includes(search.toLowerCase())||l.rule.toLowerCase().includes(search.toLowerCase())));
  return(<div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Guardrail Activity</h1><p className="text-muted-foreground">Real-time guardrail trigger log and enforcement actions</p></div><Button variant="outline"><Zap className="w-4 h-4 mr-2"/>Configure Rules</Button></div>
    <div className="grid grid-cols-4 gap-4">
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{logs.length}</div><div className="text-sm text-muted-foreground">Total Events</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-red-400">{logs.filter(l=>l.action==="blocked").length}</div><div className="text-sm text-muted-foreground">Blocked</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-yellow-400">{logs.filter(l=>l.action==="warned"||l.action==="flagged").length}</div><div className="text-sm text-muted-foreground">Warned/Flagged</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-green-400">{logs.filter(l=>l.action==="allowed").length}</div><div className="text-sm text-muted-foreground">Allowed</div></CardContent></Card>
    </div>
    <div className="flex gap-3">
      <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground"/><Input placeholder="Search guardrail events..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9"/></div>
      {["all","blocked","warned","flagged","allowed"].map(s=><Button key={s} size="sm" variant={filter===s?"default":"outline"} onClick={()=>setFilter(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</Button>)}
    </div>
    <Card><CardContent className="p-0"><table className="w-full"><thead><tr className="border-b border-border">
      <th className="text-left p-3 text-sm font-medium text-muted-foreground">ID</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Timestamp</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Agent</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Rule Triggered</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Severity</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Action</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Latency</th>
    </tr></thead><tbody>{filtered.map(l=>(
      <tr key={l.id} className="border-b border-border hover:bg-muted/50">
        <td className="p-3 text-sm font-mono">{l.id}</td><td className="p-3 text-xs text-muted-foreground">{l.timestamp}</td><td className="p-3 text-sm">{l.agent}</td><td className="p-3 text-sm font-medium">{l.rule}</td>
        <td className="p-3"><Badge className={sv[l.severity]}>{l.severity}</Badge></td><td className="p-3"><Badge className={ac[l.action]}>{l.action}</Badge></td><td className="p-3 text-xs font-mono">{l.latency}</td>
      </tr>
    ))}</tbody></table></CardContent></Card>
  </div>);
}
