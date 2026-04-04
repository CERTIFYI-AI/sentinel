import { useState } from "react";
import { Warning, Plus, MagnifyingGlass, Eye } from "@phosphor-icons/react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";

const incidents = [
  { id: "INC-001", title: "Model Output Anomaly Detected", severity: "high", status: "investigating", reported: "2026-01-15", reporter: "Model Monitor", category: "AI Safety", description: "ACME-LLM-v3 produced hallucinated financial data in 3 transactions" },
  { id: "INC-002", title: "Unauthorized API Access Attempt", severity: "critical", status: "resolved", reported: "2026-01-13", reporter: "Alex Kumar", category: "Security", description: "Blocked brute force attack on model inference API" },
  { id: "INC-003", title: "Data Pipeline Delay", severity: "medium", status: "open", reported: "2026-01-12", reporter: "James Wilson", category: "Operations", description: "Training data pipeline delayed by 4 hours" },
  { id: "INC-004", title: "Bias Threshold Breach", severity: "high", status: "mitigating", reported: "2026-01-10", reporter: "Dr. Sarah Chen", category: "Fairness", description: "Credit model shows 8% disparity in approval rates" },
  { id: "INC-005", title: "Compliance Report Failure", severity: "low", status: "resolved", reported: "2026-01-08", reporter: "Lisa Park", category: "Compliance", description: "Automated SOC2 report generation failed" },
];

export default function IncidentLog() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof incidents[0] | null>(null);
  const [open, setOpen] = useState(false);
  const filtered = incidents.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Incident Log</h1><p className="text-sm text-muted-foreground">Acme Financial Corp - Incident Management</p></div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Report Incident</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Total</div><div className="text-2xl font-bold">{incidents.length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Open</div><div className="text-2xl font-bold text-red-600">{incidents.filter(i => ["open","investigating","mitigating"].includes(i.status)).length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Critical</div><div className="text-2xl font-bold text-red-600">{incidents.filter(i => i.severity === "critical").length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Resolved</div><div className="text-2xl font-bold text-green-600">{incidents.filter(i => i.status === "resolved").length}</div></CardContent></Card>
      </div>
      <div className="relative"><MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search incidents..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card><CardContent className="pt-4">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left"><th className="p-2">ID</th><th className="p-2">Incident</th><th className="p-2">Severity</th><th className="p-2">Status</th><th className="p-2">Category</th><th className="p-2">Reported</th><th className="p-2"></th></tr></thead>
          <tbody>{filtered.map((i) => (
            <tr key={i.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => { setSelected(i); setOpen(true); }}>
              <td className="p-2 font-mono text-xs">{i.id}</td><td className="p-2 font-medium">{i.title}</td>
              <td className="p-2"><Badge variant={i.severity === "critical" ? "destructive" : i.severity === "high" ? "default" : "secondary"}>{i.severity}</Badge></td>
              <td className="p-2"><Badge variant="outline">{i.status}</Badge></td>
              <td className="p-2">{i.category}</td><td className="p-2">{i.reported}</td>
              <td className="p-2"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></td>
            </tr>))}</tbody>
        </table>
      </CardContent></Card>
      <Sheet open={open} onOpenChange={setOpen}><SheetContent className="max-w-lg"><SheetHeader><SheetTitle>{selected?.title}</SheetTitle></SheetHeader>
        {selected && (<div className="space-y-4 mt-4"><div className="grid grid-cols-2 gap-3">
          <div><span className="text-xs text-muted-foreground">ID</span><p className="text-sm font-medium">{selected.id}</p></div>
          <div><span className="text-xs text-muted-foreground">Severity</span><p className="text-sm"><Badge variant={selected.severity === "critical" ? "destructive" : "default"}>{selected.severity}</Badge></p></div>
          <div><span className="text-xs text-muted-foreground">Status</span><p className="text-sm"><Badge variant="outline">{selected.status}</Badge></p></div>
          <div><span className="text-xs text-muted-foreground">Reporter</span><p className="text-sm font-medium">{selected.reporter}</p></div>
        </div><div><span className="text-xs text-muted-foreground">Description</span><p className="text-sm">{selected.description}</p></div>
        <div className="flex gap-2 pt-2"><Button size="sm">Update Status</Button><Button size="sm" variant="outline">Assign</Button></div></div>)}
      </SheetContent></Sheet>
    </div>
  );
}
