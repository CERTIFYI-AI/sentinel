
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { AlertTriangle, Plus } from "lucide-react";

const mockRisks = [
  { id: "RSK-001", title: "LLM Data Poisoning", likelihood: 4, impact: 5, category: "AI Safety", owner: "alice@company.com", status: "open" },
  { id: "RSK-002", title: "Model Bias in Production", likelihood: 3, impact: 4, category: "AI Safety", owner: "bob@company.com", status: "mitigating" },
  { id: "RSK-003", title: "API Key Exposure", likelihood: 2, impact: 5, category: "Security", owner: "carol@company.com", status: "mitigating" },
  { id: "RSK-004", title: "Vendor Lock-in", likelihood: 3, impact: 3, category: "Vendor", owner: "dave@company.com", status: "accepted" },
  { id: "RSK-005", title: "GDPR Non-compliance", likelihood: 2, impact: 4, category: "Compliance", owner: "eve@company.com", status: "mitigating" },
  { id: "RSK-006", title: "Model Hallucination", likelihood: 5, impact: 3, category: "AI Safety", owner: "frank@company.com", status: "open" },
  { id: "RSK-007", title: "Third-party Data Breach", likelihood: 2, impact: 5, category: "Security", owner: "alice@company.com", status: "open" },
  { id: "RSK-008", title: "Prompt Injection Attack", likelihood: 4, impact: 4, category: "AI Safety", owner: "bob@company.com", status: "mitigating" },
  { id: "RSK-009", title: "Audit Failure", likelihood: 1, impact: 3, category: "Compliance", owner: "carol@company.com", status: "accepted" },
];

const riskScore = (r: any) => r.likelihood * r.impact;
const riskColor = (score: number) => score >= 16 ? "#ef4444" : score >= 9 ? "#f97316" : score >= 4 ? "#eab308" : "#16a34a";

export default function RiskMatrix() {
  const [selected, setSelected] = useState<any>(null);
  const matrix = Array.from({length:5},(_,i)=>Array.from({length:5},(_,j)=>({
    l: 5-i, im: j+1,
    risks: mockRisks.filter(r=>r.likelihood===5-i && r.impact===j+1)
  })));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Risk Matrix</h1><p className="text-sm text-gray-400">Visual risk assessment heat map</p></div>
        <Button className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Risk</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Total Risks",value:mockRisks.length,color:"text-white"},{label:"Critical (15+)",value:mockRisks.filter(r=>riskScore(r)>=15).length,color:"text-red-400"},{label:"High (9-14)",value:mockRisks.filter(r=>riskScore(r)>=9&&riskScore(r)<15).length,color:"text-orange-400"},{label:"Open",value:mockRisks.filter(r=>r.status==="open").length,color:"text-yellow-400"}].map(s=>(
          <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4"><p className="text-xs text-gray-400">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>
      <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4">
        <h3 className="text-white font-medium mb-4">5x5 Risk Heat Map</h3>
        <div className="flex gap-2">
          <div className="flex flex-col justify-between text-xs text-gray-400 pr-2 py-1" style={{writingMode:"vertical-rl",transform:"rotate(180deg)"}}>
            <span>Low</span><span style={{textAlign:"center"}}>Likelihood</span><span>High</span>
          </div>
          <div className="flex-1">
            <div className="grid gap-1" style={{gridTemplateColumns:"repeat(5,1fr)"}}>
              {matrix.map((row, ri) => row.map((cell, ci) => {
                const score = cell.l * cell.im;
                const bg = score >= 16 ? "bg-red-900/60 border-red-700" : score >= 12 ? "bg-orange-900/60 border-orange-700" : score >= 6 ? "bg-yellow-900/60 border-yellow-700" : "bg-green-900/40 border-green-800";
                return (
                  <div key={`${ri}-${ci}`} className={`min-h-16 rounded border p-1 cursor-pointer hover:opacity-80 ${bg}`} onClick={()=>cell.risks.length>0&&setSelected(cell.risks)}>
                    {cell.risks.map(r=>(<div key={r.id} className="text-xs text-white truncate bg-black/30 rounded px-1 mb-0.5">{r.title}</div>))}
                  </div>
                );
              }))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Low Impact</span><span>High Impact</span>
            </div>
          </div>
        </div>
      </CardContent></Card>
      <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4">
        <h3 className="text-white font-medium mb-3">All Risks</h3>
        <div className="space-y-2">{mockRisks.map(r=>(
          <div key={r.id} className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 cursor-pointer" onClick={()=>setSelected([r])}>
            <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold" style={{backgroundColor:riskColor(riskScore(r))+"33",color:riskColor(riskScore(r))}}>{riskScore(r)}</div>
            <div className="flex-1"><p className="text-white text-sm font-medium">{r.title}</p><p className="text-xs text-gray-400">{r.category} · {r.owner}</p></div>
            <span className={`text-xs px-2 py-0.5 rounded ${r.status==="open"?"bg-red-500/10 text-red-400":r.status==="mitigating"?"bg-yellow-500/10 text-yellow-400":"bg-green-500/10 text-green-400"}`}>{r.status}</span>
          </div>
        ))}</div>
      </CardContent></Card>
      <Dialog open={!!selected} onOpenChange={()=>setSelected(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader><DialogTitle>Risk Details</DialogTitle></DialogHeader>
          {selected && selected.map((r:any)=>(
            <div key={r.id} className="grid grid-cols-2 gap-3 text-sm">
              {[["ID",r.id],["Title",r.title],["Category",r.category],["Likelihood",r.likelihood+"/5"],["Impact",r.impact+"/5"],["Score",riskScore(r)],["Status",r.status],["Owner",r.owner]].map(([k,v])=>(
                <div key={k}><p className="text-gray-400 text-xs">{k}</p><p className="text-white">{String(v)}</p></div>
              ))}
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
