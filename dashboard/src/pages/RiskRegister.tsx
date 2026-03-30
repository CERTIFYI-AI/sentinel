import { useState } from "react";
import { Warning, Plus, MagnifyingGlass, Export, Funnel, Eye } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";

const risks = [
  { id: "RSK-001", title: "LLM Hallucination in Credit Decisions", category: "Model Risk", likelihood: "high", impact: "critical", score: 20, owner: "Dr. Sarah Chen", status: "open", mitigation: "Implement output validation layer" },
  { id: "RSK-002", title: "Training Data PII Leakage", category: "Data Privacy", likelihood: "medium", impact: "high", score: 15, owner: "James Wilson", status: "mitigating", mitigation: "Data anonymization pipeline" },
  { id: "RSK-003", title: "Model Bias in Loan Approvals", category: "Fairness", likelihood: "high", impact: "high", score: 16, owner: "Dr. Sarah Chen", status: "open", mitigation: "Bias detection and debiasing" },
  { id: "RSK-004", title: "Third-party API Data Exposure", category: "Vendor Risk", likelihood: "low", impact: "high", score: 10, owner: "Mike Johnson", status: "mitigating", mitigation: "API gateway with DLP" },
  { id: "RSK-005", title: "EU AI Act Non-compliance Penalty", category: "Regulatory", likelihood: "medium", impact: "critical", score: 18, owner: "Lisa Park", status: "open", mitigation: "Compliance roadmap execution" },
  { id: "RSK-006", title: "Adversarial Attack on Fraud Model", category: "Security", likelihood: "medium", impact: "high", score: 15, owner: "Alex Kumar", status: "accepted", mitigation: "Adversarial training" },
  { id: "RSK-007", title: "Model Drift in Production", category: "Model Risk", likelihood: "high", impact: "medium", score: 12, owner: "Dr. Sarah Chen", status: "mitigating", mitigation: "Continuous monitoring alerts" },
  { id: "RSK-008", title: "Insufficient Audit Trail", category: "Governance", likelihood: "low", impact: "medium", score: 6, owner: "Lisa Park", status: "closed", mitigation: "Implemented logging framework" },
];

export default function RiskRegister() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof risks[0] | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = risks.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) => {
    switch (s) { case "open": return "destructive"; case "mitigating": return "default"; case "accepted": return "secondary"; default: return "outline"; }
  };

  const impactColor = (i: string) => {
    switch (i) { case "critical": return "text-red-600"; case "high": return "text-orange-600"; case "medium": return "text-yellow-600"; default: return "text-green-600"; }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Risk Register</h1>
          <p className="text-sm text-muted-foreground">Acme Financial Corp - AI & Operational Risk Management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Export className="h-4 w-4 mr-1" />Export</Button>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Risk</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Total Risks</div><div className="text-2xl font-bold">{risks.length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Open</div><div className="text-2xl font-bold text-red-600">{risks.filter(r => r.status === "open").length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Mitigating</div><div className="text-2xl font-bold text-blue-600">{risks.filter(r => r.status === "mitigating").length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Avg Score</div><div className="text-2xl font-bold">{Math.round(risks.reduce((a, r) => a + r.score, 0) / risks.length)}</div></CardContent></Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search risks..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm"><Funnel className="h-4 w-4 mr-1" />Filter</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="p-2">ID</th><th className="p-2">Risk</th><th className="p-2">Category</th><th className="p-2">Impact</th><th className="p-2">Score</th><th className="p-2">Owner</th><th className="p-2">Status</th><th className="p-2"></th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => { setSelected(r); setOpen(true); }}>
                  <td className="p-2 font-mono text-xs">{r.id}</td>
                  <td className="p-2 font-medium">{r.title}</td>
                  <td className="p-2">{r.category}</td>
                  <td className={`p-2 font-medium ${impactColor(r.impact)}`}>{r.impact}</td>
                  <td className="p-2"><Badge variant={r.score >= 15 ? "destructive" : r.score >= 10 ? "default" : "secondary"}>{r.score}</Badge></td>
                  <td className="p-2">{r.owner}</td>
                  <td className="p-2"><Badge variant={statusColor(r.status) as any}>{r.status}</Badge></td>
                  <td className="p-2"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="max-w-lg">
          <SheetHeader><SheetTitle>{selected?.title}</SheetTitle></SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">ID</span><p className="text-sm font-medium">{selected.id}</p></div>
                <div><span className="text-xs text-muted-foreground">Category</span><p className="text-sm font-medium">{selected.category}</p></div>
                <div><span className="text-xs text-muted-foreground">Likelihood</span><p className="text-sm font-medium capitalize">{selected.likelihood}</p></div>
                <div><span className="text-xs text-muted-foreground">Impact</span><p className={`text-sm font-medium ${impactColor(selected.impact)}`}>{selected.impact}</p></div>
                <div><span className="text-xs text-muted-foreground">Risk Score</span><p className="text-sm font-medium">{selected.score}</p></div>
                <div><span className="text-xs text-muted-foreground">Owner</span><p className="text-sm font-medium">{selected.owner}</p></div>
              </div>
              <div><span className="text-xs text-muted-foreground">Mitigation</span><p className="text-sm">{selected.mitigation}</p></div>
              <div className="flex gap-2 pt-2">
                <Button size="sm">Update Status</Button>
                <Button size="sm" variant="outline">Edit</Button>
                <Button size="sm" variant="destructive">Escalate</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
