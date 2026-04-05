import { useState } from "react";
import { ShieldCheck, MagnifyingGlass, Plus, Export, Eye, Funnel } from "@phosphor-icons/react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";

const controls = [
  { id: "CTL-001", name: "AI Model Access Control", framework: "ISO 27001", category: "Access Management", status: "implemented", effectiveness: "high", owner: "Alex Kumar", lastReview: "2026-01-10" },
  { id: "CTL-002", name: "Training Data Encryption", framework: "SOC2", category: "Data Protection", status: "implemented", effectiveness: "high", owner: "James Wilson", lastReview: "2026-01-08" },
  { id: "CTL-003", name: "Model Output Validation", framework: "EU AI Act", category: "AI Safety", status: "partial", effectiveness: "medium", owner: "Dr. Sarah Chen", lastReview: "2026-01-05" },
  { id: "CTL-004", name: "Bias Detection Pipeline", framework: "NIST AI RMF", category: "Fairness", status: "implemented", effectiveness: "high", owner: "Dr. Sarah Chen", lastReview: "2026-12-20" },
  { id: "CTL-005", name: "Incident Response Plan", framework: "ISO 27001", category: "Incident Mgmt", status: "implemented", effectiveness: "high", owner: "Mike Johnson", lastReview: "2026-01-12" },
  { id: "CTL-006", name: "Human Oversight for High-Risk AI", framework: "EU AI Act", category: "HITL", status: "partial", effectiveness: "medium", owner: "Lisa Park", lastReview: "2026-12-15" },
  { id: "CTL-007", name: "Vendor Security Assessment", framework: "SOC2", category: "Vendor Mgmt", status: "implemented", effectiveness: "high", owner: "Mike Johnson", lastReview: "2026-01-03" },
  { id: "CTL-008", name: "Model Explainability Documentation", framework: "EU AI Act", category: "Transparency", status: "not-implemented", effectiveness: "low", owner: "Dr. Sarah Chen", lastReview: "2026-11-30" },
  { id: "CTL-009", name: "Data Retention Policy", framework: "ISO 27001", category: "Data Governance", status: "implemented", effectiveness: "high", owner: "James Wilson", lastReview: "2026-01-06" },
  { id: "CTL-010", name: "Adversarial Robustness Testing", framework: "NIST AI RMF", category: "Security", status: "partial", effectiveness: "medium", owner: "Alex Kumar", lastReview: "2026-12-22" },
];

export default function Controls() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<typeof controls[0] | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = controls.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.framework.toLowerCase().includes(search.toLowerCase());
    if (tab === "all") return matchSearch;
    return matchSearch && c.status === tab;
  });

  const statusVariant = (s: string) => {
    switch (s) { case "implemented": return "default"; case "partial": return "secondary"; default: return "destructive"; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Controls Library</h1>
          <p className="text-sm text-muted-foreground">Acme Financial Corp - Security & AI Controls</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Export className="h-4 w-4 mr-1" />Export</Button>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Control</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Total Controls</div><div className="text-2xl font-bold">{controls.length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Implemented</div><div className="text-2xl font-bold text-green-600">{controls.filter(c => c.status === "implemented").length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Partial</div><div className="text-2xl font-bold text-yellow-600">{controls.filter(c => c.status === "partial").length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Missing</div><div className="text-2xl font-bold text-red-600">{controls.filter(c => c.status === "not-implemented").length}</div></CardContent></Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1"><MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search controls..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="implemented">Implemented</TabsTrigger>
          <TabsTrigger value="partial">Partial</TabsTrigger>
          <TabsTrigger value="not-implemented">Missing</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <Card><CardContent className="pt-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="p-2">ID</th><th className="p-2">Control</th><th className="p-2">Framework</th><th className="p-2">Category</th><th className="p-2">Status</th><th className="p-2">Effectiveness</th><th className="p-2">Owner</th><th className="p-2"></th></tr></thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => { setSelected(c); setOpen(true); }}>
                    <td className="p-2 font-mono text-xs">{c.id}</td>
                    <td className="p-2 font-medium">{c.name}</td>
                    <td className="p-2"><Badge variant="outline">{c.framework}</Badge></td>
                    <td className="p-2">{c.category}</td>
                    <td className="p-2"><Badge variant={statusVariant(c.status) as any}>{c.status}</Badge></td>
                    <td className="p-2 capitalize">{c.effectiveness}</td>
                    <td className="p-2">{c.owner}</td>
                    <td className="p-2"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="max-w-lg">
          <SheetHeader><SheetTitle>{selected?.name}</SheetTitle></SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">ID</span><p className="text-sm font-medium">{selected.id}</p></div>
                <div><span className="text-xs text-muted-foreground">Framework</span><p className="text-sm font-medium">{selected.framework}</p></div>
                <div><span className="text-xs text-muted-foreground">Category</span><p className="text-sm font-medium">{selected.category}</p></div>
                <div><span className="text-xs text-muted-foreground">Status</span><p className="text-sm"><Badge variant={statusVariant(selected.status) as any}>{selected.status}</Badge></p></div>
                <div><span className="text-xs text-muted-foreground">Effectiveness</span><p className="text-sm font-medium capitalize">{selected.effectiveness}</p></div>
                <div><span className="text-xs text-muted-foreground">Owner</span><p className="text-sm font-medium">{selected.owner}</p></div>
                <div><span className="text-xs text-muted-foreground">Last Review</span><p className="text-sm font-medium">{selected.lastReview}</p></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm">Edit</Button>
                <Button size="sm" variant="outline">Test Control</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
