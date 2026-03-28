
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Search, Plus, AlertTriangle, Clock, CheckCircle } from "lucide-react";

const mockIncidents = [
  { id: "INC-001", title: "Model Output Anomaly Detected", severity: "critical", status: "open", category: "AI Safety", assignee: "alice@company.com", reportedDate: "2026-01-15", resolvedDate: "-", impact: "High", description: "GPT-4 model producing unexpected harmful content in edge cases" },
  { id: "INC-002", title: "Data Breach Attempt Blocked", severity: "high", status: "investigating", category: "Security", assignee: "bob@company.com", reportedDate: "2026-01-14", resolvedDate: "-", impact: "Medium", description: "SQL injection attempt blocked by WAF on API endpoint" },
  { id: "INC-003", title: "Compliance Deadline Missed", severity: "medium", status: "resolved", category: "Compliance", assignee: "carol@company.com", reportedDate: "2026-01-10", resolvedDate: "2026-01-13", impact: "Low", description: "SOC 2 evidence submission deadline missed by 2 days" },
  { id: "INC-004", title: "Bias Detected in Hiring Model", severity: "critical", status: "open", category: "AI Safety", assignee: "dave@company.com", reportedDate: "2026-01-13", resolvedDate: "-", impact: "High", description: "Gender bias detected in resume screening AI model" },
  { id: "INC-005", title: "API Key Exposed in Repository", severity: "high", status: "resolved", category: "Security", assignee: "eve@company.com", reportedDate: "2026-01-08", resolvedDate: "2026-01-08", impact: "Medium", description: "OpenAI API key committed to public Git repository" },
  { id: "INC-006", title: "PII Leakage in Model Logs", severity: "high", status: "investigating", category: "Privacy", assignee: "frank@company.com", reportedDate: "2026-01-12", resolvedDate: "-", impact: "High", description: "Personal information found in model inference logs" },
  { id: "INC-007", title: "Vendor SLA Violation", severity: "medium", status: "resolved", category: "Vendor", assignee: "alice@company.com", reportedDate: "2026-01-06", resolvedDate: "2026-01-11", impact: "Low", description: "Anthropic API uptime fell below 99.9% SLA target" },
  { id: "INC-008", title: "Unauthorized Model Deployment", severity: "critical", status: "resolved", category: "Security", assignee: "bob@company.com", reportedDate: "2026-01-05", resolvedDate: "2026-01-06", impact: "High", description: "Unapproved model version deployed to production" },
];

const sevColor = (s:string) => s==="critical"?"bg-red-500/10 text-red-400 border-red-500/30":s==="high"?"bg-orange-500/10 text-orange-400 border-orange-500/30":"bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
const statColor = (s:string) => s==="open"?"bg-red-500/10 text-red-400 border-red-500/30":s==="investigating"?"bg-yellow-500/10 text-yellow-400 border-yellow-500/30":"bg-green-500/10 text-green-400 border-green-500/30";

export default function IncidentLog() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<any>(null);
  const statuses = ["All","open","investigating","resolved"];
  const filtered = mockIncidents.filter(i=>(status==="All"||i.status===status)&&(i.title.toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Incident Management</h1><p className="text-sm text-gray-400">Track and manage security and AI incidents</p></div>
        <Button className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4 mr-2" />Report Incident</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Total",value:mockIncidents.length,color:"text-white"},{label:"Open",value:mockIncidents.filter(i=>i.status==="open").length,color:"text-red-400"},{label:"Investigating",value:mockIncidents.filter(i=>i.status==="investigating").length,color:"text-yellow-400"},{label:"Resolved",value:mockIncidents.filter(i=>i.status==="resolved").length,color:"text-green-400"}].map(s=>(
          <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4"><p className="text-xs text-gray-400">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>
      <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><Input placeholder="Search incidents..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-gray-800 border-gray-700 text-white" /></div>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">{statuses.map(s=><option key={s}>{s}</option>)}</select>
        </div>
        <Table>
          <TableHeader><TableRow className="border-gray-800"><TableHead className="text-gray-400">ID</TableHead><TableHead className="text-gray-400">Title</TableHead><TableHead className="text-gray-400">Severity</TableHead><TableHead className="text-gray-400">Status</TableHead><TableHead className="text-gray-400">Category</TableHead><TableHead className="text-gray-400">Assignee</TableHead><TableHead className="text-gray-400">Reported</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map(i=>(
            <TableRow key={i.id} className="border-gray-800 hover:bg-gray-800/50 cursor-pointer" onClick={()=>setSelected(i)}>
              <TableCell className="text-green-400 font-mono text-xs">{i.id}</TableCell>
              <TableCell className="text-white font-medium">{i.title}</TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded border ${sevColor(i.severity)}`}>{i.severity}</span></TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded border ${statColor(i.status)}`}>{i.status}</span></TableCell>
              <TableCell><span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{i.category}</span></TableCell>
              <TableCell className="text-gray-400 text-xs">{i.assignee}</TableCell>
              <TableCell className="text-gray-400 text-xs">{i.reportedDate}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={!!selected} onOpenChange={()=>setSelected(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader><DialogTitle>{selected?.title}</DialogTitle></DialogHeader>
          {selected && <div className="space-y-3 text-sm">
            <p className="text-gray-400">{selected.description}</p>
            <div className="grid grid-cols-2 gap-3">
              {[["ID",selected.id],["Severity",selected.severity],["Status",selected.status],["Category",selected.category],["Assignee",selected.assignee],["Impact",selected.impact],["Reported",selected.reportedDate],["Resolved",selected.resolvedDate]].map(([k,v])=>(
                <div key={k}><p className="text-gray-400 text-xs">{k}</p><p className="text-white">{v}</p></div>
              ))}
            </div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
