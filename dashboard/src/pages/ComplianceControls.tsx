
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Search, Filter, Plus, CheckCircle, XCircle, MinusCircle, Shield } from "lucide-react";

const mockControls = [
  { id: "CTL-001", name: "Access Control Policy", framework: "ISO 27001", category: "Access Control", status: "passing", owner: "Alice Chen", lastTested: "2026-03-15" },
  { id: "CTL-002", name: "Encryption at Rest", framework: "SOC2", category: "Cryptography", status: "passing", owner: "Bob Kumar", lastTested: "2026-03-10" },
  { id: "CTL-003", name: "Incident Response Plan", framework: "ISO 27001", category: "Incident Mgmt", status: "failing", owner: "Carol Davis", lastTested: "2026-02-28" },
  { id: "CTL-004", name: "Data Classification", framework: "SOC2", category: "Data Protection", status: "passing", owner: "Dave Wilson", lastTested: "2026-03-12" },
  { id: "CTL-005", name: "Vulnerability Management", framework: "ISO 27001", category: "Security Ops", status: "not-tested", owner: "Eve Sharma", lastTested: "N/A" },
  { id: "CTL-006", name: "Change Management", framework: "SOC2", category: "Operations", status: "passing", owner: "Frank Li", lastTested: "2026-03-08" },
  { id: "CTL-007", name: "Business Continuity", framework: "ISO 27001", category: "Continuity", status: "passing", owner: "Grace Kim", lastTested: "2026-03-01" },
  { id: "CTL-008", name: "Third Party Risk", framework: "SOC2", category: "Vendor Mgmt", status: "failing", owner: "Henry Zhang", lastTested: "2026-02-20" },
  { id: "CTL-009", name: "Logging and Monitoring", framework: "ISO 27001", category: "Monitoring", status: "passing", owner: "Iris Patel", lastTested: "2026-03-14" },
  { id: "CTL-010", name: "Physical Security", framework: "SOC2", category: "Physical", status: "passing", owner: "Jack Brown", lastTested: "2026-03-05" },
  { id: "CTL-011", name: "Network Security", framework: "ISO 27001", category: "Network", status: "not-tested", owner: "Karen Lee", lastTested: "N/A" },
  { id: "CTL-012", name: "HR Security", framework: "ISO 27001", category: "HR", status: "passing", owner: "Leo Martinez", lastTested: "2026-03-11" },
  { id: "CTL-013", name: "Secure Development", framework: "SOC2", category: "Development", status: "passing", owner: "Mia Johnson", lastTested: "2026-03-13" },
  { id: "CTL-014", name: "Asset Management", framework: "ISO 27001", category: "Assets", status: "failing", owner: "Noah Williams", lastTested: "2026-02-25" },
  { id: "CTL-015", name: "Privacy Controls", framework: "SOC2", category: "Privacy", status: "passing", owner: "Olivia Taylor", lastTested: "2026-03-09" },
];

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  passing: { color: "bg-green-500/10 text-green-400 border-green-500/30", icon: CheckCircle, label: "Passing" },
  failing: { color: "bg-red-500/10 text-red-400 border-red-500/30", icon: XCircle, label: "Failing" },
  "not-tested": { color: "bg-gray-500/10 text-gray-400 border-gray-500/30", icon: MinusCircle, label: "Not Tested" },
};

export default function ComplianceControls() {
  const [search, setSearch] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);

  const filtered = mockControls.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchFramework = frameworkFilter === "all" || c.framework === frameworkFilter;
    return matchSearch && matchFramework;
  });

  const stats = { total: mockControls.length, passing: mockControls.filter(c => c.status === "passing").length, failing: mockControls.filter(c => c.status === "failing").length, untested: mockControls.filter(c => c.status === "not-tested").length };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Controls Library</h1>
        <Button className="bg-green-600 hover:bg-green-700"><Plus className="h-4 w-4 mr-2" />Add Control</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Total Controls</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-400">{stats.passing}</div><div className="text-xs text-muted-foreground">Passing</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-400">{stats.failing}</div><div className="text-xs text-muted-foreground">Failing</div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-gray-400">{stats.untested}</div><div className="text-xs text-muted-foreground">Not Tested</div></CardContent></Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search controls..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={frameworkFilter} onValueChange={setFrameworkFilter}><SelectTrigger className="w-48"><SelectValue placeholder="Framework" /></SelectTrigger><SelectContent><SelectItem value="all">All Frameworks</SelectItem><SelectItem value="ISO 27001">ISO 27001</SelectItem><SelectItem value="SOC2">SOC2</SelectItem></SelectContent></Select>
      </div>

      <Card className="border-border/50">
        <Table>
          <TableHeader><TableRow><TableHead>Control ID</TableHead><TableHead>Name</TableHead><TableHead>Framework</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead><TableHead>Last Tested</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(c => {
              const st = statusConfig[c.status];
              return (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(c)}>
                  <TableCell className="font-mono text-sm">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline">{c.framework}</Badge></TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell><Badge className={st.color}>{st.label}</Badge></TableCell>
                  <TableCell>{c.owner}</TableCell>
                  <TableCell>{c.lastTested}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Control ID:</span> {selected.id}</div>
                <div><span className="text-muted-foreground">Framework:</span> {selected.framework}</div>
                <div><span className="text-muted-foreground">Category:</span> {selected.category}</div>
                <div><span className="text-muted-foreground">Owner:</span> {selected.owner}</div>
                <div><span className="text-muted-foreground">Last Tested:</span> {selected.lastTested}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={statusConfig[selected.status].color}>{statusConfig[selected.status].label}</Badge></div>
              </div>
              <div className="text-sm"><span className="text-muted-foreground">Evidence:</span> 3 documents attached</div>
              <div className="flex gap-2"><Button size="sm" variant="outline">Edit</Button><Button size="sm" variant="destructive">Delete</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
