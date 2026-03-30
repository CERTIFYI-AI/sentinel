import{useState}from"react";import{Card,CardContent}from"../../components/ui/card";import{Badge}from"../../components/ui/badge";import{Button}from"../../components/ui/button";import{Settings,Shield,Save}from"lucide-react";
const configs=[{id:"TC-01",name:"PII Detection",type:"Content Filter",enabled:true,threshold:0.85,action:"block"},{id:"TC-02",name:"Toxicity Filter",type:"Content Filter",enabled:true,threshold:0.7,action:"warn"},{id:"TC-03",name:"Prompt Injection",type:"Security",enabled:true,threshold:0.9,action:"block"},{id:"TC-04",name:"Data Boundary",type:"Privacy",enabled:true,threshold:0.95,action:"block"},{id:"TC-05",name:"Hallucination Check",type:"Quality",enabled:false,threshold:0.6,action:"flag"},{id:"TC-06",name:"Output Length Limit",type:"Resource",enabled:true,threshold:0.0,action:"truncate"}];
const ac:Record<string,string>={block:"bg-red-500/20 text-red-400",warn:"bg-yellow-500/20 text-yellow-400",flag:"bg-orange-500/20 text-orange-400",truncate:"bg-blue-500/20 text-blue-400"};
export default function TrustConfig(){return(<div className="space-y-6">
  <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Trust Engine Configuration</h1><p className="text-muted-foreground">Configure guardrails, thresholds, and enforcement policies</p></div><Button className="bg-green-600 hover:bg-green-700"><Save className="w-4 h-4 mr-2"/>Save Changes</Button></div>
  <div className="grid grid-cols-3 gap-4">
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{configs.length}</div><div className="text-sm text-muted-foreground">Total Rules</div></CardContent></Card>
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-green-400">{configs.filter(c=>c.enabled).length}</div><div className="text-sm text-muted-foreground">Active</div></CardContent></Card>
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-red-400">{configs.filter(c=>c.action==="block").length}</div><div className="text-sm text-muted-foreground">Blocking</div></CardContent></Card>
  </div>
  <Card><CardContent className="p-0"><table className="w-full"><thead><tr className="border-b border-border">
    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Rule</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Type</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Threshold</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Action</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Edit</th>
  </tr></thead><tbody>{configs.map(c=>(
    <tr key={c.id} className="border-b border-border hover:bg-muted/50">
      <td className="p-3"><div><div className="text-sm font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.id}</div></div></td>
      <td className="p-3 text-sm">{c.type}</td>
      <td className="p-3"><div className="flex items-center gap-2"><div className="w-20 h-2 bg-muted rounded-full"><div className="h-2 rounded-full bg-green-500" style={{width:`${c.threshold*100}%`}}/></div><span className="text-xs">{(c.threshold*100).toFixed(0)}%</span></div></td>
      <td className="p-3"><Badge className={ac[c.action]}>{c.action}</Badge></td>
      <td className="p-3"><Badge className={c.enabled?"bg-green-500/20 text-green-400":"bg-muted text-muted-foreground"}>{c.enabled?"Active":"Disabled"}</Badge></td>
      <td className="p-3"><Button size="sm" variant="outline" className="h-7"><Settings className="w-3 h-3"/></Button></td>
    </tr>
  ))}</tbody></table></CardContent></Card>
</div>);}
