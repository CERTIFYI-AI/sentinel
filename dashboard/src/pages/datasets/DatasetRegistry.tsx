import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Search, Plus } from "lucide-react";
const sc = (s: string) => ({yes: "bg-red-500/10 text-red-400", no: "bg-green-500/10 text-green-400", compliant: "bg-green-500/10 text-green-400", "non-compliant": "bg-red-500/10 text-red-400", pending: "bg-yellow-500/10 text-yellow-400", public: "bg-green-500/10 text-green-400", internal: "bg-yellow-500/10 text-yellow-400", confidential: "bg-red-500/10 text-red-400"} as Record<string,string>)[s] || "bg-blue-500/10 text-blue-400";
const mockData = [
  { id: "DS-001", name: "Customer Transactions", type: "Structured", source: "PostgreSQL", records: "2.4M", pii: "yes", sensitivity: "confidential", compliance: "compliant", owner: "Alice Chen", lastAudit: "2026-03-10" },
  { id: "DS-002", name: "Product Catalog", type: "Structured", source: "MySQL", records: "48K", pii: "no", sensitivity: "public", compliance: "compliant", owner: "Bob Kumar", lastAudit: "2026-03-08" },
  { id: "DS-003", name: "User Behavior Logs", type: "Semi-structured", source: "Kafka", records: "15M", pii: "yes", sensitivity: "confidential", compliance: "non-compliant", owner: "Carol Davis", lastAudit: "2026-02-28" },
  { id: "DS-004", name: "Employee Records", type: "Structured", source: "HRMS", records: "2.1K", pii: "yes", sensitivity: "confidential", compliance: "compliant", owner: "Dave Wilson", lastAudit: "2026-03-05" },
  { id: "DS-005", name: "Model Training Data", type: "Unstructured", source: "S3", records: "500K", pii: "no", sensitivity: "internal", compliance: "compliant", owner: "Eve Sharma", lastAudit: "2026-03-12" },
  { id: "DS-006", name: "Medical Records", type: "Structured", source: "HL7 FHIR", records: "180K", pii: "yes", sensitivity: "confidential", compliance: "pending", owner: "Frank Li", lastAudit: "2026-02-20" },
  { id: "DS-007", name: "Social Media Posts", type: "Unstructured", source: "Twitter API", records: "8.2M", pii: "yes", sensitivity: "internal", compliance: "compliant", owner: "Grace Kim", lastAudit: "2026-03-01" },
  { id: "DS-008", name: "Financial Reports", type: "Semi-structured", source: "ERP", records: "12K", pii: "no", sensitivity: "confidential", compliance: "compliant", owner: "Henry Zhang", lastAudit: "2026-03-14" },
  { id: "DS-009", name: "Fraud Labels", type: "Structured", source: "Manual", records: "95K", pii: "no", sensitivity: "internal", compliance: "compliant", owner: "Iris Patel", lastAudit: "2026-03-09" },
  { id: "DS-010", name: "Contract Documents", type: "Unstructured", source: "SharePoint", records: "3.4K", pii: "yes", sensitivity: "confidential", compliance: "pending", owner: "Jack Brown", lastAudit: "2026-02-25" },
  { id: "DS-011", name: "IoT Sensor Data", type: "Time-series", source: "InfluxDB", records: "120M", pii: "no", sensitivity: "internal", compliance: "compliant", owner: "Karen Lee", lastAudit: "2026-03-11" },
  { id: "DS-012", name: "Customer Feedback", type: "Unstructured", source: "Zendesk", records: "620K", pii: "yes", sensitivity: "internal", compliance: "compliant", owner: "Leo Martinez", lastAudit: "2026-03-13" },
];
export default function DatasetRegistry() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const filtered = mockData.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Dataset Registry</h1><Button className="bg-green-600 hover:bg-green-700"><Plus className="h-4 w-4 mr-2" />Register Dataset</Button></div>
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold">12</div><div className="text-xs text-muted-foreground">Total Datasets</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-400">7</div><div className="text-xs text-muted-foreground">Contains PII</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-yellow-400">2</div><div className="text-xs text-muted-foreground">Non-Compliant</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-400">10</div><div className="text-xs text-muted-foreground">Compliant</div></CardContent></Card>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search datasets..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <Card className="border-border/50"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Source</TableHead><TableHead>Records</TableHead><TableHead>PII</TableHead><TableHead>Sensitivity</TableHead><TableHead>Compliance</TableHead><TableHead>Owner</TableHead><TableHead>Last Audited</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map(r => (<TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}><TableCell className="font-mono text-sm">{r.id}</TableCell><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.type}</TableCell><TableCell>{r.source}</TableCell><TableCell>{r.records}</TableCell><TableCell><Badge className={sc(r.pii)}>{r.pii}</Badge></TableCell><TableCell><Badge className={sc(r.sensitivity)}>{r.sensitivity}</Badge></TableCell><TableCell><Badge className={sc(r.compliance)}>{r.compliance}</Badge></TableCell><TableCell>{r.owner}</TableCell><TableCell>{r.lastAudit}</TableCell></TableRow>))}</TableBody></Table></Card>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>{selected && <div className="space-y-2 text-sm">{Object.entries(selected).map(([k, v]) => <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>)}<div className="flex gap-2 pt-2"><Button size="sm" variant="outline">Edit</Button><Button size="sm" variant="destructive">Delete</Button></div></div>}</DialogContent></Dialog>
    </div>
  );
}
