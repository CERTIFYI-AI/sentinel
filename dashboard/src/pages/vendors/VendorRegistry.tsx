import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Search, Plus, Building2, Shield, AlertTriangle, CheckCircle } from "lucide-react";
const vendors = [
  {id:"V-001",name:"OpenAI",category:"LLM Provider",risk:"medium",status:"approved",score:87,contact:"vendor@openai.com",lastReview:"2026-02-10",contracts:3},
  {id:"V-002",name:"Anthropic",category:"LLM Provider",risk:"low",status:"approved",score:94,contact:"vendor@anthropic.com",lastReview:"2026-01-20",contracts:2},
  {id:"V-003",name:"AWS",category:"Cloud Infrastructure",risk:"low",status:"approved",score:96,contact:"vendor@aws.com",lastReview:"2026-03-01",contracts:5},
  {id:"V-004",name:"Pinecone",category:"Vector Database",risk:"medium",status:"review",score:72,contact:"vendor@pinecone.io",lastReview:"2026-02-15",contracts:1},
  {id:"V-005",name:"Cohere",category:"LLM Provider",risk:"medium",status:"approved",score:79,contact:"vendor@cohere.com",lastReview:"2026-01-30",contracts:2},
  {id:"V-006",name:"Hugging Face",category:"Model Hub",risk:"high",status:"review",score:61,contact:"vendor@huggingface.co",lastReview:"2026-03-10",contracts:1},
  {id:"V-007",name:"Replicate",category:"Model Hosting",risk:"high",status:"pending",score:55,contact:"vendor@replicate.com",lastReview:"2026-03-12",contracts:0},
];
const riskColor:Record<string,string>={low:"bg-green-500/20 text-green-400",medium:"bg-yellow-500/20 text-yellow-400",high:"bg-red-500/20 text-red-400"};
const statusColor:Record<string,string>={approved:"bg-green-500/20 text-green-400",review:"bg-yellow-500/20 text-yellow-400",pending:"bg-orange-500/20 text-orange-400"};
export default function VendorRegistry(){
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState<typeof vendors[0]|null>(null);
  const filtered=vendors.filter(v=>v.name.toLowerCase().includes(search.toLowerCase())||v.category.toLowerCase().includes(search.toLowerCase()));
  return(
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Vendor Registry</h1><p className="text-muted-foreground">Manage AI vendor compliance and risk assessments</p></div><Button className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2"/>Add Vendor</Button></div>
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{vendors.length}</div><div className="text-sm text-muted-foreground">Total Vendors</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-green-400">{vendors.filter(v=>v.status==="approved").length}</div><div className="text-sm text-muted-foreground">Approved</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-yellow-400">{vendors.filter(v=>v.status==="review").length}</div><div className="text-sm text-muted-foreground">In Review</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-red-400">{vendors.filter(v=>v.risk==="high").length}</div><div className="text-sm text-muted-foreground">High Risk</div></CardContent></Card>
      </div>
      <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground"/><Input placeholder="Search vendors..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9"/></div>
      <Card><CardContent className="p-0"><table className="w-full"><thead><tr className="border-b border-border">
        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Vendor</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Category</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Risk</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Score</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Last Review</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Actions</th>
      </tr></thead><tbody>{filtered.map(v=>(
        <tr key={v.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={()=>setSelected(v)}>
          <td className="p-3"><div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground"/><div><div className="text-sm font-medium">{v.name}</div><div className="text-xs text-muted-foreground">{v.id}</div></div></div></td>
          <td className="p-3 text-sm">{v.category}</td>
          <td className="p-3"><Badge className={riskColor[v.risk]}>{v.risk}</Badge></td>
          <td className="p-3"><div className="flex items-center gap-2"><div className="w-16 h-2 bg-muted rounded-full"><div className="h-2 rounded-full bg-green-500" style={{width:`${v.score}%`}}/></div><span className="text-xs">{v.score}</span></div></td>
          <td className="p-3"><Badge className={statusColor[v.status]}>{v.status}</Badge></td>
          <td className="p-3 text-sm text-muted-foreground">{v.lastReview}</td>
          <td className="p-3"><Button size="sm" variant="outline" className="h-7">Review</Button></td>
        </tr>
      ))}</tbody></table></CardContent></Card>
      {selected&&(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={()=>setSelected(null)}>
          <Card className="w-[500px]" onClick={e=>e.stopPropagation()}><CardContent className="p-6 space-y-4">
            <div className="flex justify-between"><div><h2 className="text-xl font-bold">{selected.name}</h2><p className="text-sm text-muted-foreground">{selected.category}</p></div><Badge className={riskColor[selected.risk]}>{selected.risk} risk</Badge></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">ID:</span> {selected.id}</div><div><span className="text-muted-foreground">Score:</span> {selected.score}/100</div>
              <div><span className="text-muted-foreground">Contact:</span> {selected.contact}</div><div><span className="text-muted-foreground">Contracts:</span> {selected.contracts}</div>
              <div><span className="text-muted-foreground">Last Review:</span> {selected.lastReview}</div><div><span className="text-muted-foreground">Status:</span> <Badge className={statusColor[selected.status]}>{selected.status}</Badge></div>
            </div>
            <div className="flex gap-2"><Button className="bg-green-600 hover:bg-green-700" onClick={()=>setSelected(null)}>Approve</Button><Button variant="outline" onClick={()=>setSelected(null)}>Close</Button></div>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}
