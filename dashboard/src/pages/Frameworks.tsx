
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Search, Shield, Plus, CheckCircle, AlertTriangle } from "lucide-react";

const mockFrameworks = [
  { id: "FW-001", name: "SOC 2 Type II", version: "2024", status: "active", controls: 62, passing: 54, lastAudit: "2025-11-15", nextAudit: "2026-05-15", owner: "alice@company.com", description: "Service Organization Control 2 - Trust Services Criteria" },
  { id: "FW-002", name: "ISO 27001:2022", version: "2022", status: "active", controls: 93, passing: 69, lastAudit: "2025-10-01", nextAudit: "2026-04-01", owner: "bob@company.com", description: "Information security management systems" },
  { id: "FW-003", name: "GDPR", version: "2018", status: "active", controls: 45, passing: 41, lastAudit: "2025-12-01", nextAudit: "2026-06-01", owner: "carol@company.com", description: "General Data Protection Regulation" },
  { id: "FW-004", name: "EU AI Act", version: "2024", status: "active", controls: 38, passing: 26, lastAudit: "2026-01-05", nextAudit: "2026-07-05", owner: "dave@company.com", description: "European Union Artificial Intelligence Act" },
  { id: "FW-005", name: "NIST AI RMF", version: "1.0", status: "active", controls: 55, passing: 40, lastAudit: "2025-09-20", nextAudit: "2026-03-20", owner: "eve@company.com", description: "AI Risk Management Framework" },
  { id: "FW-006", name: "HIPAA", version: "2013", status: "active", controls: 44, passing: 42, lastAudit: "2025-08-15", nextAudit: "2026-02-15", owner: "frank@company.com", description: "Health Insurance Portability and Accountability Act" },
];

export default function Frameworks() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const filtered = mockFrameworks.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Compliance Frameworks</h1><p className="text-sm text-gray-400">Manage regulatory and compliance frameworks</p></div>
        <Button className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Framework</Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{label:"Active Frameworks",value:mockFrameworks.length,color:"text-green-400"},{label:"Total Controls",value:mockFrameworks.reduce((a,f)=>a+f.controls,0),color:"text-white"},{label:"Avg Score",value:Math.round(mockFrameworks.reduce((a,f)=>a+(f.passing/f.controls*100),0)/mockFrameworks.length)+"%",color:"text-green-400"}].map(s=>(
          <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4"><p className="text-xs text-gray-400">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>
      <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><Input placeholder="Search frameworks..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-gray-800 border-gray-700 text-white" /></div>
      <div className="grid grid-cols-2 gap-4">{filtered.map(fw=>{
        const score = Math.round(fw.passing/fw.controls*100);
        return (
          <Card key={fw.id} className="bg-gray-900 border-gray-800 hover:border-green-600/50 cursor-pointer transition-colors" onClick={()=>setSelected(fw)}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-400" /><h3 className="text-white font-medium">{fw.name}</h3></div>
                <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded border border-green-500/30">{fw.status}</span>
              </div>
              <p className="text-sm text-gray-400 mb-3">{fw.description}</p>
              <div className="flex-1 bg-gray-700 rounded-full h-2 mb-2"><div className="h-2 rounded-full" style={{width:`${score}%`,backgroundColor:score>=80?"#16a34a":score>=70?"#eab308":"#ef4444"}} /></div>
              <div className="flex justify-between text-xs text-gray-400"><span>{fw.passing}/{fw.controls} controls passing</span><span className="font-bold" style={{color:score>=80?"#16a34a":score>=70?"#eab308":"#ef4444"}}>{score}%</span></div>
            </CardContent>
          </Card>
        );
      })}</div>
      <Dialog open={!!selected} onOpenChange={()=>setSelected(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && <div className="space-y-3 text-sm">
            <p className="text-gray-400">{selected.description}</p>
            <div className="grid grid-cols-2 gap-3">
              {[["Version",selected.version],["Owner",selected.owner],["Controls",selected.controls],["Passing",selected.passing],["Last Audit",selected.lastAudit],["Next Audit",selected.nextAudit]].map(([k,v])=>(
                <div key={k}><p className="text-gray-400 text-xs">{k}</p><p className="text-white">{String(v)}</p></div>
              ))}
            </div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
