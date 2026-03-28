
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Search, FileText, Download, Filter } from "lucide-react";

const mockLogs = [
  { id: "AL-001", action: "Model Deployed", user: "alice@company.com", resource: "gpt-4-prod", category: "Model", severity: "info", timestamp: "2026-01-15 09:12:34", ip: "10.0.1.45", details: "Model GPT-4 deployed to production environment" },
  { id: "AL-002", action: "Policy Updated", user: "bob@company.com", resource: "data-privacy-v2", category: "Policy", severity: "warning", timestamp: "2026-01-15 10:45:22", ip: "10.0.1.67", details: "Data privacy policy updated, version bumped to 2.1" },
  { id: "AL-003", action: "User Login Failed", user: "carol@company.com", resource: "auth-service", category: "Security", severity: "critical", timestamp: "2026-01-15 11:03:11", ip: "192.168.5.22", details: "3 consecutive failed login attempts detected" },
  { id: "AL-004", action: "Risk Accepted", user: "dave@company.com", resource: "RISK-042", category: "Risk", severity: "warning", timestamp: "2026-01-15 13:22:09", ip: "10.0.1.88", details: "High risk accepted with business justification" },
  { id: "AL-005", action: "Control Tested", user: "eve@company.com", resource: "CC-6.1", category: "Compliance", severity: "info", timestamp: "2026-01-15 14:05:55", ip: "10.0.2.11", details: "SOC 2 control CC-6.1 tested and passed" },
  { id: "AL-006", action: "Vendor Added", user: "frank@company.com", resource: "VND-009", category: "Vendor", severity: "info", timestamp: "2026-01-15 15:30:44", ip: "10.0.1.45", details: "New vendor Cohere added to vendor registry" },
  { id: "AL-007", action: "API Key Rotated", user: "system", resource: "openai-prod-key", category: "Security", severity: "info", timestamp: "2026-01-15 16:00:00", ip: "10.0.0.1", details: "Scheduled API key rotation completed successfully" },
  { id: "AL-008", action: "Evidence Uploaded", user: "alice@company.com", resource: "EVD-2026-01", category: "Compliance", severity: "info", timestamp: "2026-01-15 16:45:30", ip: "10.0.1.45", details: "Penetration test report uploaded as evidence" },
  { id: "AL-009", action: "Incident Opened", user: "security-bot", resource: "INC-2026-003", category: "Security", severity: "critical", timestamp: "2026-01-15 17:10:00", ip: "10.0.0.2", details: "Automated incident created for anomalous model output" },
  { id: "AL-010", action: "Permission Changed", user: "admin@company.com", resource: "role-analyst", category: "RBAC", severity: "warning", timestamp: "2026-01-15 18:00:00", ip: "10.0.1.10", details: "Analyst role granted access to model deployment" },
];

const severityColor = (s: string) => s === "critical" ? "bg-red-500/10 text-red-400 border-red-500/30" : s === "warning" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-green-500/10 text-green-400 border-green-500/30";

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [severity, setSeverity] = useState("All");
  const [selected, setSelected] = useState<any>(null);
  const categories = ["All", ...Array.from(new Set(mockLogs.map(l => l.category)))];
  const severities = ["All", "info", "warning", "critical"];
  const filtered = mockLogs.filter(l =>
    (category === "All" || l.category === category) &&
    (severity === "All" || l.severity === severity) &&
    (l.action.toLowerCase().includes(search.toLowerCase()) || l.user.toLowerCase().includes(search.toLowerCase()) || l.resource.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Audit Log</h1><p className="text-sm text-gray-400">Complete audit trail of all platform activity</p></div>
        <Button variant="outline" className="border-green-600 text-green-400 hover:bg-green-600/10"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Total Events",value:mockLogs.length,color:"text-white"},{label:"Critical",value:mockLogs.filter(l=>l.severity==="critical").length,color:"text-red-400"},{label:"Warnings",value:mockLogs.filter(l=>l.severity==="warning").length,color:"text-yellow-400"},{label:"Today",value:mockLogs.length,color:"text-green-400"}].map(stat=>(
          <Card key={stat.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4"><p className="text-xs text-gray-400">{stat.label}</p><p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p></CardContent></Card>
        ))}
      </div>
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><Input placeholder="Search logs..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-gray-800 border-gray-700 text-white" /></div>
            <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">{categories.map(c=><option key={c}>{c}</option>)}</select>
            <select value={severity} onChange={e=>setSeverity(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">{severities.map(s=><option key={s}>{s}</option>)}</select>
          </div>
          <Table>
            <TableHeader><TableRow className="border-gray-800"><TableHead className="text-gray-400">ID</TableHead><TableHead className="text-gray-400">Timestamp</TableHead><TableHead className="text-gray-400">Action</TableHead><TableHead className="text-gray-400">User</TableHead><TableHead className="text-gray-400">Resource</TableHead><TableHead className="text-gray-400">Category</TableHead><TableHead className="text-gray-400">Severity</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map(log=>(
              <TableRow key={log.id} className="border-gray-800 hover:bg-gray-800/50 cursor-pointer" onClick={()=>setSelected(log)}>
                <TableCell className="text-green-400 font-mono text-xs">{log.id}</TableCell>
                <TableCell className="text-gray-300 text-xs font-mono">{log.timestamp}</TableCell>
                <TableCell className="text-white font-medium">{log.action}</TableCell>
                <TableCell className="text-gray-300">{log.user}</TableCell>
                <TableCell className="text-gray-400 font-mono text-xs">{log.resource}</TableCell>
                <TableCell><span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{log.category}</span></TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded border ${severityColor(log.severity)}`}>{log.severity}</span></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!selected} onOpenChange={()=>setSelected(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader><DialogTitle>Audit Event Detail</DialogTitle></DialogHeader>
          {selected && <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["ID",selected.id],["Action",selected.action],["User",selected.user],["Resource",selected.resource],["Category",selected.category],["Severity",selected.severity],["IP Address",selected.ip],["Timestamp",selected.timestamp]].map(([k,v])=>(
                <div key={k}><p className="text-gray-400 text-xs">{k}</p><p className="text-white font-medium">{v}</p></div>
              ))}
            </div>
            <div><p className="text-gray-400 text-xs mb-1">Details</p><p className="text-white text-sm bg-gray-800 p-3 rounded">{selected.details}</p></div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
