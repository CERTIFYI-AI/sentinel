
import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Search, Plus } from "lucide-react";

const mockVulns = [
  { id: "CVE-2025-1234", title: "Prompt Injection via User Input", severity: "critical", asset: "GPT-4 API", status: "open", discovered: "2026-01-10", cve: "CVE-2025-1234", remediation: "Input sanitization required" },
  { id: "CVE-2025-5678", title: "Insecure Model Deserialization", severity: "high", asset: "Training Pipeline", status: "patched", discovered: "2025-12-15", cve: "CVE-2025-5678", remediation: "Update to patched version 2.1" },
  { id: "INT-001", title: "Missing Rate Limiting", severity: "medium", asset: "Inference API", status: "in-progress", discovered: "2026-01-08", cve: "-", remediation: "Implement rate limiting middleware" },
  { id: "INT-002", title: "Weak API Authentication", severity: "high", asset: "Admin API", status: "open", discovered: "2026-01-12", cve: "-", remediation: "Enforce OAuth 2.0" },
  { id: "CVE-2025-9012", title: "Vector DB Data Exfiltration", severity: "critical", asset: "Pinecone", status: "open", discovered: "2026-01-14", cve: "CVE-2025-9012", remediation: "Network isolation and encryption" },
];
const sevColor = (s:string) => s==="critical"?"bg-red-500/10 text-red-400 border-red-500/30":s==="high"?"bg-orange-500/10 text-orange-400 border-orange-500/30":"bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
const statColor = (s:string) => s==="open"?"text-red-400":s==="in-progress"?"text-yellow-400":"text-green-400";

export default function VulnTracker() {
  const [search, setSearch] = useState("");
  const [sev, setSev] = useState("All");
  const sevs = ["All","critical","high","medium"];
  const filtered = mockVulns.filter(v=>(sev==="All"||v.severity===sev)&&(v.title.toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Vulnerability Tracker</h1><p className="text-sm text-gray-400">Track and remediate security vulnerabilities</p></div>
        <Button className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Finding</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Total",value:mockVulns.length,color:"text-white"},{label:"Critical",value:mockVulns.filter(v=>v.severity==="critical").length,color:"text-red-400"},{label:"High",value:mockVulns.filter(v=>v.severity==="high").length,color:"text-orange-400"},{label:"Open",value:mockVulns.filter(v=>v.status==="open").length,color:"text-yellow-400"}].map(s=>(
          <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4"><p className="text-xs text-gray-400">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>
      <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><Input placeholder="Search vulnerabilities..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-gray-800 border-gray-700 text-white" /></div>
          <select value={sev} onChange={e=>setSev(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">{sevs.map(s=><option key={s}>{s}</option>)}</select>
        </div>
        <Table>
          <TableHeader><TableRow className="border-gray-800"><TableHead className="text-gray-400">ID</TableHead><TableHead className="text-gray-400">Title</TableHead><TableHead className="text-gray-400">Severity</TableHead><TableHead className="text-gray-400">Asset</TableHead><TableHead className="text-gray-400">Status</TableHead><TableHead className="text-gray-400">Discovered</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map(v=>(
            <TableRow key={v.id} className="border-gray-800 hover:bg-gray-800/50">
              <TableCell className="text-green-400 font-mono text-xs">{v.id}</TableCell>
              <TableCell className="text-white font-medium">{v.title}</TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded border ${sevColor(v.severity)}`}>{v.severity}</span></TableCell>
              <TableCell className="text-gray-300">{v.asset}</TableCell>
              <TableCell><span className={`text-xs font-medium ${statColor(v.status)}`}>{v.status}</span></TableCell>
              <TableCell className="text-gray-400 text-xs">{v.discovered}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
