import { useState } from "react";
import { ClockCounterClockwise, MagnifyingGlass, Export, Funnel, Eye } from "@phosphor-icons/react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const logs = [
  { id: "AUD-001", action: "Model Deployed", entity: "ACME-LLM-v3", user: "Dr. Sarah Chen", timestamp: "2026-01-15T09:30:00Z", category: "model", details: "Production deployment v3.2.1" },
  { id: "AUD-002", action: "Control Updated", entity: "CTL-003", user: "Alex Kumar", timestamp: "2026-01-15T08:15:00Z", category: "control", details: "Status changed to partial" },
  { id: "AUD-003", action: "Evidence Uploaded", entity: "EVD-045", user: "James Wilson", timestamp: "2026-01-14T16:45:00Z", category: "evidence", details: "SOC2 access review evidence" },
  { id: "AUD-004", action: "Risk Created", entity: "RSK-008", user: "Lisa Park", timestamp: "2026-01-14T14:20:00Z", category: "risk", details: "New governance risk identified" },
  { id: "AUD-005", action: "Policy Approved", entity: "POL-AI-003", user: "Lisa Park", timestamp: "2026-01-14T11:00:00Z", category: "policy", details: "AI Ethics Policy v2 approved" },
  { id: "AUD-006", action: "Bias Audit Run", entity: "ACME-Credit-v2", user: "Dr. Sarah Chen", timestamp: "2026-01-13T15:30:00Z", category: "audit", details: "Automated bias scan completed" },
  { id: "AUD-007", action: "Vendor Assessed", entity: "VND-003", user: "Mike Johnson", timestamp: "2026-01-13T10:00:00Z", category: "vendor", details: "TrustAI Inc security review" },
  { id: "AUD-008", action: "User Role Changed", entity: "USR-012", user: "Admin", timestamp: "2026-01-12T09:00:00Z", category: "access", details: "Promoted to Compliance Officer" },
];

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const filtered = logs.filter((l) => l.action.toLowerCase().includes(search.toLowerCase()) || l.entity.toLowerCase().includes(search.toLowerCase()) || l.user.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Acme Financial Corp - Complete Activity Trail</p>
        </div>
        <Button variant="outline" size="sm"><Export className="h-4 w-4 mr-1" />Export</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Total Events</div><div className="text-2xl font-bold">{logs.length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Today</div><div className="text-2xl font-bold">2</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Users Active</div><div className="text-2xl font-bold">6</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Categories</div><div className="text-2xl font-bold">7</div></CardContent></Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1"><MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search audit log..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Button variant="outline" size="sm"><Funnel className="h-4 w-4 mr-1" />Filter</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {filtered.map((l) => (
              <div key={l.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                <ClockCounterClockwise className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{l.action}</span>
                    <Badge variant="outline" className="text-xs">{l.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{l.details}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Entity: {l.entity}</span>
                    <span className="text-xs text-muted-foreground">\u00b7</span>
                    <span className="text-xs text-muted-foreground">By: {l.user}</span>
                    <span className="text-xs text-muted-foreground">\u00b7</span>
                    <span className="text-xs text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
