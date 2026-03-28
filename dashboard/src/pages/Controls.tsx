
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Search, Plus, Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const mockControls = [
  { id: "CTL-001", name: "Access Control Policy", framework: "SOC 2", controlId: "CC-6.1", status: "passing", severity: "high", owner: "alice@company.com", lastTested: "2026-01-10", evidence: 3, description: "Logical and physical access controls are in place" },
  { id: "CTL-002", name: "Change Management", framework: "SOC 2", controlId: "CC-8.1", status: "passing", severity: "high", owner: "bob@company.com", lastTested: "2026-01-08", evidence: 2, description: "Changes to infrastructure and software are authorized" },
  { id: "CTL-003", name: "Risk Assessment", framework: "ISO 27001", controlId: "A.8.1", status: "failing", severity: "critical", owner: "carol@company.com", lastTested: "2025-12-20", evidence: 1, description: "Regular risk assessments of information assets" },
  { id: "CTL-004", name: "Data Classification", framework: "GDPR", controlId: "Art.5", status: "passing", severity: "medium", owner: "dave@company.com", lastTested: "2026-01-05", evidence: 4, description: "Personal data is classified and labeled" },
  { id: "CTL-005", name: "Model Transparency", framework: "AI Act", controlId: "AI-T-01", status: "failing", severity: "high", owner: "eve@company.com", lastTested: "2026-01-12", evidence: 0, description: "AI model decision-making is transparent and documented" },
  { id: "CTL-006", name: "Incident Response", framework: "SOC 2", controlId: "CC-7.3", status: "passing", severity: "critical", owner: "frank@company.com", lastTested: "2026-01-11", evidence: 5, description: "Security incidents are identified and responded to" },
  { id: "CTL-007", name: "Encryption at Rest", framework: "ISO 27001", controlId: "A.10.1", status: "passing", severity: "high", owner: "alice@company.com", lastTested: "2026-01-09", evidence: 2, description: "Data at rest is encrypted using AES-256" },
  { id: "CTL-008", name: "Bias Monitoring", framework: "AI Act", controlId: "AI-B-01", status: "warning", severity: "high", owner: "bob@company.com", lastTested: "2026-01-14", evidence: 1, description: "AI models are monitored for bias and fairness" },
  { id: "CTL-009", name: "Vendor Due Diligence", framework: "SOC 2", controlId: "CC-9.2", status: "passing", severity: "medium", owner: "carol@company.com", lastTested: "2025-12-15", evidence: 3, description: "Third-party vendors undergo security assessment" },
  { id: "CTL-010", name: "Data Retention", framework: "GDPR", controlId: "Art.17", status: "warning", severity: "medium", owner: "dave@company.com", lastTested: "2025-11-30", evidence: 2, description: "Data retention policies are enforced" },
];

const statusColor = (s:string) => s==="passing" ? "bg-green-500/10 text-green-400 border-green-500/30" : s==="failing" ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
const severityColor = (s:string) => s==="critical" ? "text-red-400" : s==="high" ? "text-orange-400" : "text-yellow-400";

export default function Controls() {
  const [search, setSearch] = useState("");
  const [framework, setFramework] = useState("All");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<any>(null);
  const frameworks = ["All", ...Array.from(new Set(mockControls.map(c => c.framework)))];
  const statuses = ["All", "passing", "failing", "warning"];
  const filtered = mockControls.filter(c =>
    (framework === "All" || c.framework === framework) &&
    (status === "All" || c.status === status) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.controlId.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Controls Library</h1><p className="text-sm text-gray-400">Manage compliance controls across frameworks</p></div>
        <Button className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Control</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Total Controls",value:mockControls.length,color:"text-white"},{label:"Passing",value:mockControls.filter(c=>c.status==="passing").length,color:"text-green-400"},{label:"Failing",value:mockControls.filter(c=>c.status==="failing").length,color:"text-red-400"},{label:"Warning",value:mockControls.filter(c=>c.status==="warning").length,color:"text-yellow-400"}].map(s=>(
          <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4"><p className="text-xs text-gray-400">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>
      <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><Input placeholder="Search controls..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-gray-800 border-gray-700 text-white" /></div>
          <select value={framework} onChange={e=>setFramework(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">{frameworks.map(f=><option key={f}>{f}</option>)}</select>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">{statuses.map(s=><option key={s}>{s}</option>)}</select>
        </div>
        <Table>
          <TableHeader><TableRow className="border-gray-800"><TableHead className="text-gray-400">Control ID</TableHead><TableHead className="text-gray-400">Name</TableHead><TableHead className="text-gray-400">Framework</TableHead><TableHead className="text-gray-400">Severity</TableHead><TableHead className="text-gray-400">Status</TableHead><TableHead className="text-gray-400">Last Tested</TableHead><TableHead className="text-gray-400">Evidence</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map(c=>(
            <TableRow key={c.id} className="border-gray-800 hover:bg-gray-800/50 cursor-pointer" onClick={()=>setSelected(c)}>
              <TableCell className="text-green-400 font-mono text-xs">{c.controlId}</TableCell>
              <TableCell className="text-white font-medium">{c.name}</TableCell>
              <TableCell><span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{c.framework}</span></TableCell>
              <TableCell><span className={`text-xs font-medium ${severityColor(c.severity)}`}>{c.severity}</span></TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded border ${statusColor(c.status)}`}>{c.status}</span></TableCell>
              <TableCell className="text-gray-400 text-xs">{c.lastTested}</TableCell>
              <TableCell className="text-gray-300 text-xs">{c.evidence} items</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={!!selected} onOpenChange={()=>setSelected(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && <div className="space-y-3 text-sm">
            <p className="text-gray-400">{selected.description}</p>
            <div className="grid grid-cols-2 gap-3">
              {[["Control ID",selected.controlId],["Framework",selected.framework],["Status",selected.status],["Severity",selected.severity],["Owner",selected.owner],["Last Tested",selected.lastTested],["Evidence",selected.evidence+" items"]].map(([k,v])=>(
                <div key={k}><p className="text-gray-400 text-xs">{k}</p><p className="text-white">{String(v)}</p></div>
              ))}
            </div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
