
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Search, Plus, Upload, FileText, CheckCircle, Clock } from "lucide-react";

const mockEvidence = [
  { id: "EVD-001", title: "Penetration Test Report 2026", type: "Security Report", control: "CC-7.2", framework: "SOC 2", status: "approved", uploadedBy: "alice@company.com", uploadDate: "2026-01-10", expiryDate: "2027-01-10", fileSize: "2.4 MB", tags: ["pentest","security"] },
  { id: "EVD-002", title: "Access Control Policy v3", type: "Policy Document", control: "CC-6.1", framework: "SOC 2", status: "approved", uploadedBy: "bob@company.com", uploadDate: "2025-12-15", expiryDate: "2026-12-15", fileSize: "340 KB", tags: ["policy","access"] },
  { id: "EVD-003", title: "ISO 27001 Internal Audit", type: "Audit Report", control: "A.9.1", framework: "ISO 27001", status: "under-review", uploadedBy: "carol@company.com", uploadDate: "2026-01-12", expiryDate: "2027-01-12", fileSize: "5.1 MB", tags: ["iso","audit"] },
  { id: "EVD-004", title: "Vendor Security Assessment - OpenAI", type: "Vendor Report", control: "CC-9.2", framework: "SOC 2", status: "approved", uploadedBy: "dave@company.com", uploadDate: "2025-11-20", expiryDate: "2026-11-20", fileSize: "1.2 MB", tags: ["vendor","openai"] },
  { id: "EVD-005", title: "GDPR Data Mapping Record", type: "Compliance Doc", control: "Art.30", framework: "GDPR", status: "approved", uploadedBy: "eve@company.com", uploadDate: "2025-10-05", expiryDate: "2026-10-05", fileSize: "890 KB", tags: ["gdpr","data"] },
  { id: "EVD-006", title: "Model Risk Assessment - GPT-4", type: "Risk Document", control: "MRM-01", framework: "AI Act", status: "under-review", uploadedBy: "frank@company.com", uploadDate: "2026-01-14", expiryDate: "2026-07-14", fileSize: "3.7 MB", tags: ["model","risk"] },
  { id: "EVD-007", title: "Business Continuity Plan", type: "Policy Document", control: "A.17.1", framework: "ISO 27001", status: "expired", uploadedBy: "alice@company.com", uploadDate: "2024-06-01", expiryDate: "2025-06-01", fileSize: "1.8 MB", tags: ["bcp","continuity"] },
  { id: "EVD-008", title: "Employee Security Training Records", type: "Training", control: "CC-1.4", framework: "SOC 2", status: "approved", uploadedBy: "hr@company.com", uploadDate: "2026-01-03", expiryDate: "2027-01-03", fileSize: "450 KB", tags: ["training","awareness"] },
];

const statusColor = (s:string) => s==="approved" ? "bg-green-500/10 text-green-400 border-green-500/30" : s==="under-review" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-red-500/10 text-red-400 border-red-500/30";

export default function EvidenceVault() {
  const [search, setSearch] = useState("");
  const [framework, setFramework] = useState("All");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<any>(null);
  const frameworks = ["All", ...Array.from(new Set(mockEvidence.map(e => e.framework)))];
  const statuses = ["All", "approved", "under-review", "expired"];
  const filtered = mockEvidence.filter(e =>
    (framework === "All" || e.framework === framework) &&
    (status === "All" || e.status === status) &&
    (e.title.toLowerCase().includes(search.toLowerCase()) || e.control.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Evidence Vault</h1><p className="text-sm text-gray-400">Centralized compliance evidence repository</p></div>
        <Button className="bg-green-600 hover:bg-green-700 text-white"><Upload className="w-4 h-4 mr-2" />Upload Evidence</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Total Evidence",value:mockEvidence.length,color:"text-white",icon:FileText},{label:"Approved",value:mockEvidence.filter(e=>e.status==="approved").length,color:"text-green-400",icon:CheckCircle},{label:"Under Review",value:mockEvidence.filter(e=>e.status==="under-review").length,color:"text-yellow-400",icon:Clock},{label:"Expired",value:mockEvidence.filter(e=>e.status==="expired").length,color:"text-red-400",icon:FileText}].map(stat=>(
          <Card key={stat.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4 flex items-center gap-3"><stat.icon className={`w-8 h-8 ${stat.color}`} /><div><p className="text-xs text-gray-400">{stat.label}</p><p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p></div></CardContent></Card>
        ))}
      </div>
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><Input placeholder="Search evidence..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-gray-800 border-gray-700 text-white" /></div>
            <select value={framework} onChange={e=>setFramework(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">{frameworks.map(f=><option key={f}>{f}</option>)}</select>
            <select value={status} onChange={e=>setStatus(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">{statuses.map(s=><option key={s}>{s}</option>)}</select>
          </div>
          <Table>
            <TableHeader><TableRow className="border-gray-800"><TableHead className="text-gray-400">ID</TableHead><TableHead className="text-gray-400">Title</TableHead><TableHead className="text-gray-400">Type</TableHead><TableHead className="text-gray-400">Control</TableHead><TableHead className="text-gray-400">Framework</TableHead><TableHead className="text-gray-400">Status</TableHead><TableHead className="text-gray-400">Expiry</TableHead><TableHead className="text-gray-400">Size</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map(ev=>(
              <TableRow key={ev.id} className="border-gray-800 hover:bg-gray-800/50 cursor-pointer" onClick={()=>setSelected(ev)}>
                <TableCell className="text-green-400 font-mono text-xs">{ev.id}</TableCell>
                <TableCell className="text-white font-medium">{ev.title}</TableCell>
                <TableCell className="text-gray-400 text-xs">{ev.type}</TableCell>
                <TableCell className="text-gray-300 font-mono text-xs">{ev.control}</TableCell>
                <TableCell><span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{ev.framework}</span></TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded border ${statusColor(ev.status)}`}>{ev.status}</span></TableCell>
                <TableCell className="text-gray-400 text-xs">{ev.expiryDate}</TableCell>
                <TableCell className="text-gray-400 text-xs">{ev.fileSize}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!selected} onOpenChange={()=>setSelected(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader><DialogTitle>{selected?.title}</DialogTitle></DialogHeader>
          {selected && <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[["ID",selected.id],["Type",selected.type],["Control",selected.control],["Framework",selected.framework],["Status",selected.status],["Uploaded By",selected.uploadedBy],["Upload Date",selected.uploadDate],["Expiry",selected.expiryDate],["File Size",selected.fileSize]].map(([k,v])=>(
                <div key={k}><p className="text-gray-400 text-xs">{k}</p><p className="text-white">{v}</p></div>
              ))}
            </div>
            <div><p className="text-gray-400 text-xs mb-1">Tags</p><div className="flex gap-1 flex-wrap">{selected.tags.map((t:string)=><span key={t} className="text-xs px-2 py-0.5 bg-green-900/30 text-green-400 rounded">{t}</span>)}</div></div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="bg-green-600 hover:bg-green-700">Download</Button>
              <Button size="sm" variant="outline" className="border-gray-700">View</Button>
            </div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
