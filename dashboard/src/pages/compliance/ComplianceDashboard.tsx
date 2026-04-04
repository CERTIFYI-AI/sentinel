import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, AlertTriangle, FileText, TrendingUp, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const gaugeColor = (v: number) => v >= 90 ? "#22c55e" : v >= 70 ? "#eab308" : "#ef4444";

function ComplianceGauge({ value }: { value: number }) {
  const r = 70, c = 2 * Math.PI * r, pct = (value / 100) * c;
  return (
    <svg viewBox="0 0 160 160" className="w-40 h-40">
      <circle cx="80" cy="80" r={r} fill="none" stroke="#1e293b" strokeWidth="14" />
      <circle cx="80" cy="80" r={r} fill="none" stroke={gaugeColor(value)} strokeWidth="14"
        strokeDasharray={`${pct} ${c - pct}`} strokeDashoffset={c / 4} strokeLinecap="round" />
      <text x="80" y="75" textAnchor="middle" className="fill-white text-2xl font-bold">{value}%</text>
      <text x="80" y="95" textAnchor="middle" className="fill-slate-400 text-xs">Compliance</text>
    </svg>
  );
}

const statsCards = [
  { label: "Compliance", value: "87%", icon: Shield, color: "text-green-400" },
  { label: "Gaps", value: "18", icon: AlertTriangle, color: "text-yellow-400" },
  { label: "Evidence", value: "1.2K", icon: FileText, color: "text-blue-400" },
  { label: "Trend", value: "+5%", icon: TrendingUp, color: "text-primary" },
];

const frameworkScores = [
  { name: "SOC 2 Type II", score: 92, controls: 87, gaps: 4, status: "On Track" },
  { name: "ISO 27001", score: 88, controls: 114, gaps: 8, status: "On Track" },
  { name: "NIST CSF", score: 76, controls: 98, gaps: 12, status: "At Risk" },
  { name: "HIPAA", score: 94, controls: 54, gaps: 2, status: "On Track" },
  { name: "PCI DSS", score: 81, controls: 72, gaps: 6, status: "Needs Attention" },
  { name: "GDPR", score: 85, controls: 63, gaps: 5, status: "On Track" },
];

const gapsList = [
  { id: "GAP-001", framework: "NIST CSF", control: "PR.AC-1", title: "Access Control Policy", severity: "High", owner: "IT Security", due: "2024-03-15" },
  { id: "GAP-002", framework: "SOC 2", control: "CC6.1", title: "Logical Access Controls", severity: "Medium", owner: "DevOps", due: "2024-03-20" },
  { id: "GAP-003", framework: "ISO 27001", control: "A.12.6.1", title: "Technical Vulnerability Mgmt", severity: "High", owner: "Security Ops", due: "2024-02-28" },
  { id: "GAP-004", framework: "PCI DSS", control: "Req 8.3", title: "MFA Implementation", severity: "Critical", owner: "IAM Team", due: "2024-03-10" },
  { id: "GAP-005", framework: "HIPAA", control: "164.312(a)", title: "Encryption at Rest", severity: "Medium", owner: "Data Eng", due: "2024-04-01" },
  { id: "GAP-006", framework: "NIST CSF", control: "DE.CM-1", title: "Network Monitoring", severity: "High", owner: "SOC Team", due: "2024-03-25" },
];

const sevColor = (s: string) =>
  s === "Critical" ? "text-red-400 bg-red-400/10" :
  s === "High" ? "text-orange-400 bg-orange-400/10" :
  s === "Medium" ? "text-yellow-400 bg-yellow-400/10" : "text-green-400 bg-green-400/10";

const statusColor = (s: string) =>
  s === "On Track" ? "text-green-400 bg-green-400/10" :
  s === "At Risk" ? "text-red-400 bg-red-400/10" : "text-yellow-400 bg-yellow-400/10";

export default function ComplianceDashboardPage() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<any>(null);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1>Compliance Dashboard</h1>
        <Button variant="outline" onClick={() => nav("/compliance/controls")}>
          Control Library <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Gauge + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="md:col-span-1 flex items-center justify-center">
          <CardContent className="pt-6">
            <ComplianceGauge value={87} />
          </CardContent>
        </Card>
        {statsCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold mt-2">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Framework Table */}
      <Card>
        <CardHeader><CardTitle>Framework Compliance</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Framework</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Controls</TableHead>
                <TableHead>Gaps</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {frameworkScores.map((f) => (
                <TableRow key={f.name} className="cursor-pointer hover:bg-muted/50"
                  onClick={() => nav(`/frameworks?framework=${encodeURIComponent(f.name)}`)}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${f.score >= 90 ? "bg-green-500" : f.score >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${f.score}%` }} />
                      </div>
                      <span className="text-sm">{f.score}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{f.controls}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSel(f); setOpen(true); }}>
                      {f.gaps} gaps
                    </Button>
                  </TableCell>
                  <TableCell><Badge className={statusColor(f.status)}>{f.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Gap Drill-down Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{sel?.name} — Gap Analysis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold">{sel?.score}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Controls</p>
                  <p className="text-2xl font-bold">{sel?.controls}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Gaps</p>
                  <p className="text-2xl font-bold text-yellow-400">{sel?.gaps}</p>
                </CardContent>
              </Card>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Control</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gapsList.filter((g) => !sel || g.framework.includes(sel?.name?.split(" ")[0] || "")).map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-xs">{g.id}</TableCell>
                    <TableCell>{g.control}</TableCell>
                    <TableCell>{g.title}</TableCell>
                    <TableCell><Badge className={sevColor(g.severity)}>{g.severity}</Badge></TableCell>
                    <TableCell>{g.owner}</TableCell>
                    <TableCell>{g.due}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
