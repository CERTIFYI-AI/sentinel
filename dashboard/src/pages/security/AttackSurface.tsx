
import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Search, Shield, AlertTriangle } from "lucide-react";

const mockAssets = [
  { id: "AS-001", name: "GPT-4 API Endpoint", type: "AI API", exposure: "external", risk: "high", vulnerabilities: 2, lastScan: "2026-01-15", status: "monitored" },
  { id: "AS-002", name: "Model Training Pipeline", type: "Internal Service", exposure: "internal", risk: "medium", vulnerabilities: 0, lastScan: "2026-01-14", status: "monitored" },
  { id: "AS-003", name: "Vector Database (Pinecone)", type: "External DB", exposure: "external", risk: "high", vulnerabilities: 1, lastScan: "2026-01-13", status: "at-risk" },
  { id: "AS-004", name: "Auth Service", type: "Internal Service", exposure: "internal", risk: "critical", vulnerabilities: 3, lastScan: "2026-01-12", status: "at-risk" },
  { id: "AS-005", name: "Webhook Receiver", type: "API", exposure: "external", risk: "medium", vulnerabilities: 1, lastScan: "2026-01-11", status: "monitored" },
  { id: "AS-006", name: "Admin Dashboard", type: "Web App", exposure: "internal", risk: "high", vulnerabilities: 0, lastScan: "2026-01-10", status: "monitored" },
  { id: "AS-007", name: "Model Inference Server", type: "Internal Service", exposure: "internal", risk: "low", vulnerabilities: 0, lastScan: "2026-01-15", status: "monitored" },
];
const riskColor = (r:string) => r==="critical"?"text-red-400":r==="high"?"text-orange-400":r==="medium"?"text-yellow-400":"text-green-400";
const statColor = (s:string) => s==="at-risk"?"bg-red-500/10 text-red-400 border-red-500/30":"bg-green-500/10 text-green-400 border-green-500/30";

export default function AttackSurface() {
  const [search, setSearch] = useState("");
  const filtered = mockAssets.filter(a=>a.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Attack Surface</h1><p className="text-sm text-gray-400">Monitor and manage your AI attack surface</p></div>
        <Button className="bg-green-600 hover:bg-green-700 text-white">Run Scan</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Total Assets",value:mockAssets.length,color:"text-white"},{label:"At Risk",value:mockAssets.filter(a=>a.status==="at-risk").length,color:"text-red-400"},{label:"Vulnerabilities",value:mockAssets.reduce((s,a)=>s+a.vulnerabilities,0),color:"text-orange-400"},{label:"External",value:mockAssets.filter(a=>a.exposure==="external").length,color:"text-yellow-400"}].map(s=>(
          <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4"><p className="text-xs text-gray-400">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>
      <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4 space-y-4">
        <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><Input placeholder="Search assets..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-gray-800 border-gray-700 text-white" /></div>
        <Table>
          <TableHeader><TableRow className="border-gray-800"><TableHead className="text-gray-400">Asset</TableHead><TableHead className="text-gray-400">Type</TableHead><TableHead className="text-gray-400">Exposure</TableHead><TableHead className="text-gray-400">Risk</TableHead><TableHead className="text-gray-400">Vulns</TableHead><TableHead className="text-gray-400">Last Scan</TableHead><TableHead className="text-gray-400">Status</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map(a=>(
            <TableRow key={a.id} className="border-gray-800 hover:bg-gray-800/50">
              <TableCell className="text-white font-medium">{a.name}</TableCell>
              <TableCell><span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{a.type}</span></TableCell>
              <TableCell className="text-gray-400 text-xs">{a.exposure}</TableCell>
              <TableCell><span className={`text-xs font-medium ${riskColor(a.risk)}`}>{a.risk}</span></TableCell>
              <TableCell className={a.vulnerabilities>0?"text-red-400 font-bold":"text-gray-400"}>{a.vulnerabilities}</TableCell>
              <TableCell className="text-gray-400 text-xs">{a.lastScan}</TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded border ${statColor(a.status)}`}>{a.status}</span></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
