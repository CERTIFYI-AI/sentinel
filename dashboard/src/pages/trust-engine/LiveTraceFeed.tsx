import{useState}from"react";import{Card,CardContent}from"../../components/ui/card";import{Badge}from"../../components/ui/badge";import{Button}from"../../components/ui/button";import{Activity,RefreshCw,Pause,Play}from"lucide-react";
const traces=[{id:"T-001",timestamp:"14:23:01.234",agent:"ComplianceBot",action:"llm.call",model:"GPT-4o",tokens:1247,latency:"890ms",status:"ok"},{id:"T-002",timestamp:"14:23:00.891",agent:"RiskAnalyzer",action:"tool.invoke",model:"Claude-3",tokens:0,latency:"45ms",status:"ok"},{id:"T-003",timestamp:"14:22:59.102",agent:"SupportBot",action:"guardrail.check",model:"-",tokens:0,latency:"12ms",status:"blocked"},{id:"T-004",timestamp:"14:22:58.445",agent:"DataGuard",action:"llm.call",model:"Gemini-Pro",tokens:892,latency:"1200ms",status:"timeout"},{id:"T-005",timestamp:"14:22:57.001",agent:"LegalDraft",action:"llm.call",model:"GPT-4o",tokens:2341,latency:"1450ms",status:"ok"},{id:"T-006",timestamp:"14:22:56.332",agent:"ComplianceBot",action:"fallback",model:"Claude-3",tokens:567,latency:"340ms",status:"ok"}];
const sc:Record<string,string>={ok:"bg-green-500/20 text-green-400",blocked:"bg-red-500/20 text-red-400",timeout:"bg-yellow-500/20 text-yellow-400",error:"bg-red-500/20 text-red-400"};
const atc:Record<string,string>={"llm.call":"bg-blue-500/20 text-blue-400","tool.invoke":"bg-purple-500/20 text-purple-400","guardrail.check":"bg-orange-500/20 text-orange-400",fallback:"bg-yellow-500/20 text-yellow-400"};
export default function LiveTraceFeed(){
  const[paused,setPaused]=useState(false);
  return(<div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Live Trace Feed</h1><p className="text-muted-foreground">Real-time stream of agent actions, LLM calls, and tool invocations</p></div><div className="flex gap-2"><Button variant={paused?"default":"outline"} onClick={()=>setPaused(!paused)}>{paused?<Play className="w-4 h-4 mr-2"/>:<Pause className="w-4 h-4 mr-2"/>}{paused?"Resume":"Pause"}</Button><Button variant="outline"><RefreshCw className="w-4 h-4 mr-2"/>Clear</Button></div></div>
    <div className="grid grid-cols-4 gap-4">
      <Card><CardContent className="pt-4 text-center"><Activity className="w-5 h-5 mx-auto mb-1 text-green-400 animate-pulse"/><div className="text-sm font-medium">Live</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{traces.length}</div><div className="text-sm text-muted-foreground">Events/sec</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{traces.reduce((a,t)=>a+t.tokens,0).toLocaleString()}</div><div className="text-sm text-muted-foreground">Tokens Used</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-red-400">{traces.filter(t=>t.status!=="ok").length}</div><div className="text-sm text-muted-foreground">Errors</div></CardContent></Card>
    </div>
    <Card><CardContent className="p-0"><table className="w-full"><thead><tr className="border-b border-border">
      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Time</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Agent</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Action</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Model</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Tokens</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Latency</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
    </tr></thead><tbody>{traces.map(t=>(
      <tr key={t.id} className="border-b border-border hover:bg-muted/50">
        <td className="p-3 text-xs font-mono text-muted-foreground">{t.timestamp}</td><td className="p-3 text-sm">{t.agent}</td><td className="p-3"><Badge className={atc[t.action]||"bg-muted"}>{t.action}</Badge></td><td className="p-3 text-sm">{t.model}</td><td className="p-3 text-sm font-mono">{t.tokens||"-"}</td><td className="p-3 text-xs font-mono">{t.latency}</td><td className="p-3"><Badge className={sc[t.status]}>{t.status}</Badge></td>
      </tr>
    ))}</tbody></table></CardContent></Card>
  </div>);}
