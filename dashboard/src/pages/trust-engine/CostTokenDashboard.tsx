import{Card,CardContent}from"../../components/ui/card";import{Badge}from"../../components/ui/badge";import{BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,LineChart,Line,PieChart,Pie,Cell}from"recharts";
const daily=[{day:"Mon",tokens:45200,cost:1.35},{day:"Tue",tokens:62100,cost:1.86},{day:"Wed",tokens:38400,cost:1.15},{day:"Thu",tokens:71800,cost:2.15},{day:"Fri",tokens:55600,cost:1.67},{day:"Sat",tokens:21300,cost:0.64},{day:"Sun",tokens:18900,cost:0.57}];
const byModel=[{name:"GPT-4o",tokens:182000,cost:5.46,color:"#22c55e"},{name:"Claude-3",tokens:98000,cost:2.94,color:"#3b82f6"},{name:"Gemini-Pro",tokens:45000,cost:0.68,color:"#eab308"},{name:"GPT-3.5",tokens:12000,cost:0.02,color:"#8b5cf6"}];
const byAgent=[{name:"ComplianceBot",tokens:120000,pct:35},{name:"RiskAnalyzer",tokens:85000,pct:25},{name:"SupportBot",tokens:68000,pct:20},{name:"DataGuard",tokens:42000,pct:12},{name:"LegalDraft",tokens:22000,pct:8}];
export default function CostTokenDashboard(){const total=daily.reduce((a,d)=>a+d.tokens,0);const totalCost=daily.reduce((a,d)=>a+d.cost,0);return(<div className="space-y-6">
  <div><h1 className="text-2xl font-bold">Cost & Token Dashboard</h1><p className="text-muted-foreground">Monitor AI spend, token consumption, and cost optimization</p></div>
  <div className="grid grid-cols-4 gap-4">
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{(total/1000).toFixed(0)}K</div><div className="text-sm text-muted-foreground">Tokens This Week</div></CardContent></Card>
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-green-400">${totalCost.toFixed(2)}</div><div className="text-sm text-muted-foreground">Total Cost</div></CardContent></Card>
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{byModel.length}</div><div className="text-sm text-muted-foreground">Active Models</div></CardContent></Card>
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-blue-400">{byAgent.length}</div><div className="text-sm text-muted-foreground">Active Agents</div></CardContent></Card>
  </div>
  <div className="grid grid-cols-2 gap-4">
    <Card><CardContent className="pt-4"><h3 className="text-sm font-medium mb-3">Daily Token Usage</h3><div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={daily}><XAxis dataKey="day" tick={{fontSize:11}}/><YAxis/><Tooltip/><Bar dataKey="tokens" fill="#22c55e" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></CardContent></Card>
    <Card><CardContent className="pt-4"><h3 className="text-sm font-medium mb-3">Daily Cost Trend</h3><div className="h-48"><ResponsiveContainer width="100%" height="100%"><LineChart data={daily}><XAxis dataKey="day" tick={{fontSize:11}}/><YAxis/><Tooltip/><Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2}/></LineChart></ResponsiveContainer></div></CardContent></Card>
  </div>
  <div className="grid grid-cols-2 gap-4">
    <Card><CardContent className="pt-4"><h3 className="text-sm font-medium mb-3">Cost by Model</h3><div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byModel} dataKey="cost" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,cost})=>`${name}: $${cost}`}>{byModel.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></CardContent></Card>
    <Card><CardContent className="pt-4"><h3 className="text-sm font-medium mb-3">Token Usage by Agent</h3><div className="space-y-3">{byAgent.map(a=><div key={a.name} className="flex items-center gap-3"><span className="text-sm w-28 truncate">{a.name}</span><div className="flex-1 h-2 bg-muted rounded-full"><div className="h-2 rounded-full bg-green-500" style={{width:`${a.pct}%`}}/></div><span className="text-xs text-muted-foreground">{a.pct}%</span></div>)}</div></CardContent></Card>
  </div>
</div>);}
