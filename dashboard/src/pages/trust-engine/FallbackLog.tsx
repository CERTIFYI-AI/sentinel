import{useState}from"react";import{Card,CardContent}from"../../components/ui/card";import{Badge}from"../../components/ui/badge";import{Button}from"../../components/ui/button";import{Input}from"../../components/ui/input";import{Search,AlertTriangle,RefreshCw}from"lucide-react";
const logs=[{id:"FB-001",timestamp:"2026-03-15 14:22:10",agent:"ComplianceBot",model:"GPT-4o",fallbackTo:"Claude-3",reason:"Rate limit exceeded",status:"success",latency:"340ms"},{id:"FB-002",timestamp:"2026-03-15 13:45:22",agent:"RiskAnalyzer",model:"Claude-3",fallbackTo:"GPT-3.5",reason:"Context length exceeded",status:"success",latency:"280ms"},{id:"FB-003",timestamp:"2026-03-15 12:30:01",agent:"SupportBot",model:"Gemini-Pro",fallbackTo:"GPT-4o",reason:"API timeout",status:"failed",latency:"5000ms"},{id:"FB-004",timestamp:"2026-03-15 11:15:44",agent:"DataGuard",model:"GPT-4o",fallbackTo:"Claude-3",reason:"Content policy violation",status:"success",latency:"195ms"},{id:"FB-005",timestamp:"2026-03-15 10:00:33",agent:"LegalDraft",model:"GPT-4o",fallbackTo:"Claude-3",reason:"Server error 503",status:"success",latency:"412ms"}];
const sc:Record<string,string>={success:"bg-green-500/20 text-green-400",failed:"bg-red-500/20 text-red-400"};
export default function FallbackLog(){
  const[search,setSearch]=useState("");
  const filtered=logs.filter(l=>l.agent.toLowerCase().includes(search.toLowerCase())||l.reason.toLowerCase().includes(search.toLowerCase()));
  return(<div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Fallback Log</h1><p className="text-muted-foreground">Model fallback events and failover chain history</p></div><Button variant="outline"><RefreshCw className="w-4 h-4 mr-2"/>Refresh</Button></div>
    <div className="grid grid-cols-3 gap-4">
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{logs.length}</div><div className="text-sm text-muted-foreground">Total Fallbacks</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-green-400">{logs.filter(l=>l.status==="success").length}</div><div className="text-sm text-muted-foreground">Successful</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-red-400">{logs.filter(l=>l.status==="failed").length}</div><div className="text-sm text-muted-foreground">Failed</div></CardContent></Card>
    </div>
    <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground"/><Input placeholder="Search fallback log..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9"/></div>
    <Card><CardContent className="p-0"><table className="w-full"><thead><tr className="border-b border-border">
      <th className="text-left p-3 text-sm font-medium text-muted-foreground">ID</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Timestamp</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Agent</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Primary Model</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Fallback To</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Reason</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Latency</th>
    </tr></thead><tbody>{filtered.map(l=>(
      <tr key={l.id} className="border-b border-border hover:bg-muted/50">
        <td className="p-3 text-sm font-mono">{l.id}</td><td className="p-3 text-xs text-muted-foreground">{l.timestamp}</td><td className="p-3 text-sm">{l.agent}</td><td className="p-3 text-sm">{l.model}</td><td className="p-3 text-sm font-medium text-blue-400">{l.fallbackTo}</td><td className="p-3 text-sm text-muted-foreground">{l.reason}</td>
        <td className="p-3"><Badge className={sc[l.status]}>{l.status}</Badge></td><td className="p-3 text-xs font-mono">{l.latency}</td>
      </tr>
    ))}</tbody></table></CardContent></Card>
  </div>);
}
