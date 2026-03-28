
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Search, Plus, Cpu, CheckCircle, Clock, AlertTriangle } from "lucide-react";

const mockModels = [
  { id: "MDL-001", name: "GPT-4 Production", provider: "OpenAI", version: "gpt-4-0125", stage: "production", riskLevel: "high", status: "active", deployedDate: "2025-12-01", lastEval: "2026-01-10", accuracy: 94.2, latency: "340ms", owner: "alice@company.com" },
  { id: "MDL-002", name: "Claude-3 Opus", provider: "Anthropic", version: "claude-3-opus-20240229", stage: "production", riskLevel: "high", status: "active", deployedDate: "2025-11-15", lastEval: "2026-01-08", accuracy: 92.7, latency: "520ms", owner: "bob@company.com" },
  { id: "MDL-003", name: "Llama-3 Fine-tuned", provider: "Internal", version: "llama-3-8b-ft-v2", stage: "staging", riskLevel: "medium", status: "testing", deployedDate: "-", lastEval: "2026-01-14", accuracy: 88.1, latency: "180ms", owner: "carol@company.com" },
  { id: "MDL-004", name: "Embedding Model", provider: "OpenAI", version: "text-embedding-3-large", stage: "production", riskLevel: "low", status: "active", deployedDate: "2025-10-01", lastEval: "2025-12-20", accuracy: 98.5, latency: "90ms", owner: "dave@company.com" },
  { id: "MDL-005", name: "Code Assistant", provider: "Anthropic", version: "claude-3-haiku", stage: "development", riskLevel: "medium", status: "development", deployedDate: "-", lastEval: "-", accuracy: 0, latency: "-", owner: "eve@company.com" },
  { id: "MDL-006", name: "Moderation Model", provider: "Internal", version: "sentinel-mod-v1", stage: "production", riskLevel: "critical", status: "active", deployedDate: "2025-09-15", lastEval: "2026-01-12", accuracy: 96.8, latency: "50ms", owner: "frank@company.com" },
  { id: "MDL-007", name: "Document Summarizer", provider: "OpenAI", version: "gpt-4-turbo", stage: "deprecated", riskLevel: "low", status: "deprecated", deployedDate: "2024-06-01", lastEval: "2025-10-01", accuracy: 91.3, latency: "800ms", owner: "alice@company.com" },
];

const stageColor = (s:string) => s==="production"?"bg-green-500/10 text-green-400 border-green-500/30":s==="staging"?"bg-yellow-500/10 text-yellow-400 border-yellow-500/30":s==="deprecated"?"bg-red-500/10 text-red-400 border-red-500/30":"bg-blue-500/10 text-blue-400 border-blue-500/30";
const riskColor = (r:string) => r==="critical"?"text-red-400":r==="high"?"text-orange-400":r==="medium"?"text-yellow-400":"text-green-400";

export default function ModelLifecycle() {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("All");
  const [selected, setSelected] = useState<any>(null);
  const stages = ["All","production","staging","development","deprecated"];
  const filtered = mockModels.filter(m=>(stage==="All"||m.stage===stage)&&(m.name.toLowerCase().includes(search.toLowerCase())||m.provider.toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Model Lifecycle</h1><p className="text-sm text-gray-400">Track AI models through their lifecycle stages</p></div>
        <Button className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4 mr-2" />Register Model</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Total Models",value:mockModels.length,color:"text-white"},{label:"Production",value:mockModels.filter(m=>m.stage==="production").length,color:"text-green-400"},{label:"Testing/Staging",value:mockModels.filter(m=>m.stage==="staging").length,color:"text-yellow-400"},{label:"Deprecated",value:mockModels.filter(m=>m.stage==="deprecated").length,color:"text-red-400"}].map(s=>(
          <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4"><p className="text-xs text-gray-400">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>
      <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><Input placeholder="Search models..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-gray-800 border-gray-700 text-white" /></div>
          <select value={stage} onChange={e=>setStage(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">{stages.map(s=><option key={s}>{s}</option>)}</select>
        </div>
        <Table>
          <TableHeader><TableRow className="border-gray-800"><TableHead className="text-gray-400">Model</TableHead><TableHead className="text-gray-400">Provider</TableHead><TableHead className="text-gray-400">Version</TableHead><TableHead className="text-gray-400">Stage</TableHead><TableHead className="text-gray-400">Risk</TableHead><TableHead className="text-gray-400">Accuracy</TableHead><TableHead className="text-gray-400">Latency</TableHead><TableHead className="text-gray-400">Owner</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map(m=>(
            <TableRow key={m.id} className="border-gray-800 hover:bg-gray-800/50 cursor-pointer" onClick={()=>setSelected(m)}>
              <TableCell className="text-white font-medium">{m.name}</TableCell>
              <TableCell><span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{m.provider}</span></TableCell>
              <TableCell className="text-gray-400 text-xs font-mono">{m.version}</TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded border ${stageColor(m.stage)}`}>{m.stage}</span></TableCell>
              <TableCell><span className={`text-xs font-medium ${riskColor(m.riskLevel)}`}>{m.riskLevel}</span></TableCell>
              <TableCell className="text-gray-300">{m.accuracy > 0 ? m.accuracy+"%" : "-"}</TableCell>
              <TableCell className="text-gray-400 text-xs">{m.latency}</TableCell>
              <TableCell className="text-gray-400 text-xs">{m.owner}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={!!selected} onOpenChange={()=>setSelected(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && <div className="grid grid-cols-2 gap-3 text-sm">
            {[["ID",selected.id],["Provider",selected.provider],["Version",selected.version],["Stage",selected.stage],["Risk Level",selected.riskLevel],["Owner",selected.owner],["Deployed",selected.deployedDate],["Last Eval",selected.lastEval],["Accuracy",selected.accuracy+"%"],["Latency",selected.latency]].map(([k,v])=>(
              <div key={k}><p className="text-gray-400 text-xs">{k}</p><p className="text-white">{String(v)}</p></div>
            ))}
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
