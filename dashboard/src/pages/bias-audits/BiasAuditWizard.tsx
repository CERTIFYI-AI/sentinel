import{useState}from"react";import{Card,CardContent}from"../../components/ui/card";import{Badge}from"../../components/ui/badge";import{Button}from"../../components/ui/button";import{Input}from"../../components/ui/input";import{Search,Plus,AlertTriangle,CheckCircle,BarChart2,RefreshCw}from"lucide-react";import{BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,Cell}from"recharts";
const audits=[{id:"BA-001",model:"CreditScorer v2.1",dataset:"Loan Applications 2025",status:"failed",severity:"high",date:"2026-03-14",metrics:{demographicParity:0.23,equalOpportunity:0.18,calibration:0.91},protected:["Gender","Race","Age"],owner:"Risk Team"},{id:"BA-002",model:"HiringFilter Pro",dataset:"Resume Dataset Q1",status:"passed",severity:"low",date:"2026-03-12",metrics:{demographicParity:0.04,equalOpportunity:0.06,calibration:0.97},protected:["Gender","Ethnicity"],owner:"HR Analytics"},{id:"BA-003",model:"SentimentClassifier",dataset:"Customer Reviews",status:"warning",severity:"medium",date:"2026-03-10",metrics:{demographicParity:0.12,equalOpportunity:0.09,calibration:0.88},protected:["Language","Region"],owner:"CX Team"},{id:"BA-004",model:"LoanApproval AI",dataset:"FICO Dataset 2024",status:"failed",severity:"critical",date:"2026-03-08",metrics:{demographicParity:0.31,equalOpportunity:0.27,calibration:0.79},protected:["Race","Gender","Income"],owner:"Credit Team"},{id:"BA-005",model:"MedicalTriage v1.0",dataset:"Patient Records",status:"passed",severity:"low",date:"2026-03-05",metrics:{demographicParity:0.03,equalOpportunity:0.05,calibration:0.99},protected:["Age","Gender"],owner:"HealthOps"}];
const sc:Record<string,string>={failed:"bg-red-500/20 text-red-400",passed:"bg-green-500/20 text-green-400",warning:"bg-yellow-500/20 text-yellow-400"};
const sv:Record<string,string>={critical:"bg-red-500/20 text-red-400",high:"bg-orange-500/20 text-orange-400",medium:"bg-yellow-500/20 text-yellow-400",low:"bg-green-500/20 text-green-400"};
export default function BiasAuditWizard(){
  const[search,setSearch]=useState("");const[sel,setSel]=useState<typeof audits[0]|null>(null);
  const filtered=audits.filter(a=>a.model.toLowerCase().includes(search.toLowerCase())||a.id.includes(search));
  const chartData=sel?[{name:"Dem. Parity",value:sel.metrics.demographicParity,threshold:0.1},{name:"Equal Opp.",value:sel.metrics.equalOpportunity,threshold:0.1},{name:"Calibration",value:1-sel.metrics.calibration,threshold:0.05}]:[];
  return(<div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Bias Audit Center</h1><p className="text-muted-foreground">Detect and remediate algorithmic bias in AI models</p></div><Button className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2"/>New Audit</Button></div>
    <div className="grid grid-cols-4 gap-4">
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{audits.length}</div><div className="text-sm text-muted-foreground">Total Audits</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-red-400">{audits.filter(a=>a.status==="failed").length}</div><div className="text-sm text-muted-foreground">Failed</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-yellow-400">{audits.filter(a=>a.status==="warning").length}</div><div className="text-sm text-muted-foreground">Warnings</div></CardContent></Card>
      <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-green-400">{audits.filter(a=>a.status==="passed").length}</div><div className="text-sm text-muted-foreground">Passed</div></CardContent></Card>
    </div>
    <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground"/><Input placeholder="Search audits..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9"/></div>
    <Card><CardContent className="p-0"><table className="w-full"><thead><tr className="border-b border-border">
      <th className="text-left p-3 text-sm font-medium text-muted-foreground">ID</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Model</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Dataset</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Protected Attrs</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Severity</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Date</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Actions</th>
    </tr></thead><tbody>{filtered.map(a=>(
      <tr key={a.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={()=>setSel(a)}>
        <td className="p-3 text-sm font-mono">{a.id}</td><td className="p-3 text-sm font-medium">{a.model}</td><td className="p-3 text-sm text-muted-foreground">{a.dataset}</td>
        <td className="p-3"><div className="flex gap-1 flex-wrap">{a.protected.map(p=><span key={p} className="text-xs bg-muted px-1.5 py-0.5 rounded">{p}</span>)}</div></td>
        <td className="p-3"><Badge className={sv[a.severity]}>{a.severity}</Badge></td><td className="p-3"><Badge className={sc[a.status]}>{a.status}</Badge></td><td className="p-3 text-sm text-muted-foreground">{a.date}</td>
        <td className="p-3"><Button size="sm" variant="outline" className="h-7">View Report</Button></td>
      </tr>
    ))}</tbody></table></CardContent></Card>
    {sel&&(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={()=>setSel(null)}>
      <Card className="w-[600px]" onClick={e=>e.stopPropagation()}><CardContent className="p-6 space-y-4">
        <div className="flex justify-between"><div><h2 className="text-xl font-bold">{sel.model}</h2><p className="text-sm text-muted-foreground">{sel.id} | {sel.owner}</p></div><Badge className={sc[sel.status]}>{sel.status}</Badge></div>
        <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis/><Tooltip/><Bar dataKey="value" radius={[4,4,0,0]}>{chartData.map((e,i)=><Cell key={i} fill={e.value>e.threshold?"#ef4444":"#22c55e"}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Dataset:</span> {sel.dataset}</div><div><span className="text-muted-foreground">Date:</span> {sel.date}</div>
          <div><span className="text-muted-foreground">Dem. Parity Gap:</span> {sel.metrics.demographicParity}</div><div><span className="text-muted-foreground">Equal Opp. Gap:</span> {sel.metrics.equalOpportunity}</div>
        </div>
        <div className="flex gap-2"><Button className="bg-green-600 hover:bg-green-700" onClick={()=>setSel(null)}>Remediate</Button><Button variant="outline" onClick={()=>setSel(null)}>Close</Button></div>
      </CardContent></Card>
    </div>)}
  </div>);
}
