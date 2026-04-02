import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, Clock, Calendar, User } from "lucide-react";
import { complianceGaps, getGapsForFramework, getDaysUntilDue } from "../data/complianceGapData";
import { cn } from "../lib/utils";

function ComplianceGauge({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={8} opacity={0.3} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={8}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">{score}</span>
        <span className="text-[11px] text-muted-foreground mt-0.5">Overall Score</span>
      </div>
    </div>
  );
}

const trendData = [
  { month: "Oct", overall: 78, controls: 72, evidence: 68 },
  { month: "Nov", overall: 81, controls: 75, evidence: 71 },
  { month: "Dec", overall: 83, controls: 79, evidence: 74 },
  { month: "Jan", overall: 85, controls: 82, evidence: 78 },
  { month: "Feb", overall: 86, controls: 84, evidence: 82 },
  { month: "Mar", overall: 87, controls: 87, evidence: 85 },
];

const gapBarData = [
  { name: "SOC 2", gaps: 4 },
  { name: "NIST AI RMF", gaps: 4 },
  { name: "OWASP LLM", gaps: 3 },
  { name: "ISO 27001", gaps: 2 },
  { name: "EU AI Act", gaps: 2 },
];

const frameworks = [
  { id: "FW-001", shortName: "ISO 42001", score: 84, controls: 38, gaps: 3, evidence: 92, status: "Compliant" as const },
  { id: "FW-002", shortName: "ISO 27001", score: 91, controls: 93, gaps: 2, evidence: 187, status: "Compliant" as const },
  { id: "FW-003", shortName: "SOC 2", score: 82, controls: 78, gaps: 4, evidence: 156, status: "Partial" as const },
  { id: "FW-004", shortName: "EU AI Act", score: 68, controls: 45, gaps: 2, evidence: 89, status: "Partial" as const },
  { id: "FW-005", shortName: "NIST AI RMF", score: 79, controls: 62, gaps: 4, evidence: 124, status: "Partial" as const },
  { id: "FW-006", shortName: "OWASP LLM", score: 86, controls: 26, gaps: 3, evidence: 78, status: "Compliant" as const },
];

export default function ComplianceDashboard() {
  const navigate = useNavigate();
  const [gapDetailOpen, setGapDetailOpen] = useState(false);
  const [selectedFrameworkGaps, setSelectedFrameworkGaps] = useState("");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time AI governance compliance posture across 6 frameworks</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/compliance/controls")}>View Control Library</Button>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-3 p-6 flex flex-col items-center justify-center">
          <ComplianceGauge score={87} />
        </Card>
        <div className="col-span-5 grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Frameworks Tracked</p>
              <ShieldCheck className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold tabular-nums mt-1">6</p>
            <p className="text-xs text-muted-foreground mt-0.5">ISO 42001, ISO 27001, SOC 2 +3</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Open Gaps</p>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold tabular-nums mt-1">15</p>
            <p className="text-xs text-muted-foreground mt-0.5">5 critical, 8 high, 2 medium</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Evidence Items</p>
              <Clock className="h-4 w-4 text-violet-400" />
            </div>
            <p className="text-2xl font-bold tabular-nums mt-1">1,247</p>
            <p className="text-xs text-muted-foreground mt-0.5">44 pending review</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Control Coverage</p>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold tabular-nums mt-1">87%</p>
            <p className="text-xs text-muted-foreground mt-0.5">298 of 342 implemented</p>
          </Card>
        </div>
        <div className="col-span-4 grid grid-cols-3 gap-3">
          <Card className="p-3 bg-red-500/10 border-red-500/20">
            <span className="text-sm text-muted-foreground">Critical Gaps</span>
            <span className="block text-xl font-bold tabular-nums text-red-400 mt-1">5</span>
          </Card>
          <Card className="p-3 bg-amber-500/10 border-amber-500/20">
            <span className="text-sm text-muted-foreground">High Gaps</span>
            <span className="block text-xl font-bold tabular-nums text-amber-400 mt-1">8</span>
          </Card>
          <Card className="p-3 bg-orange-500/10 border-orange-500/20">
            <span className="text-sm text-muted-foreground">Overdue Items</span>
            <span className="block text-xl font-bold tabular-nums text-orange-400 mt-1">4</span>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Compliance Score Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" domain={[50, 100]} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend verticalAlign="top" height={36} formatter={(value: string) => <span style={{ color: "hsl(var(--foreground))", fontSize: "12px" }}>{value === "overall" ? "Overall Score" : value === "controls" ? "Control Coverage" : "Evidence Freshness"}</span>} />
              <Line type="monotone" dataKey="overall" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="controls" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="evidence" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Gaps by Framework</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gapBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="gaps" fill="#f59e0b" radius={[4,4,0,0]} cursor="pointer"
                onClick={(data: any) => { setSelectedFrameworkGaps(data.name); setGapDetailOpen(true); }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Framework Compliance Status</h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Framework</TableHead>
                <TableHead className="text-xs">Score</TableHead>
                <TableHead className="text-xs">Controls</TableHead>
                <TableHead className="text-xs">Gaps</TableHead>
                <TableHead className="text-xs">Evidence</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {frameworks.map((fw) => (
                <TableRow key={fw.id} className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/compliance/controls?framework=${encodeURIComponent(fw.shortName)}`)}>
                  <TableCell className="font-medium">{fw.shortName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full", fw.score >= 80 ? "bg-emerald-500" : fw.score >= 60 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${fw.score}%` }} />
                      </div>
                      <span className="text-xs tabular-nums">{fw.score}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">{fw.controls}</TableCell>
                  <TableCell className="text-xs tabular-nums">{fw.gaps}</TableCell>
                  <TableCell className="text-xs tabular-nums">{fw.evidence}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] h-5", fw.status === "Compliant" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>{fw.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      <Sheet open={gapDetailOpen} onOpenChange={setGapDetailOpen}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedFrameworkGaps} Open Gaps</SheetTitle>
            <SheetDescription>Gaps requiring remediation for {selectedFrameworkGaps} compliance</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {getGapsForFramework(selectedFrameworkGaps).map((gap) => (
              <div key={gap.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{gap.id}</span>
                    <Badge variant="outline" className={cn("text-[10px] h-5", gap.severity === "Critical" ? "bg-red-500/10 text-red-400 border-red-500/20" : gap.severity === "High" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20")}>{gap.severity}</Badge>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5">{gap.controlRef}</Badge>
                </div>
                <p className="text-sm">{gap.title}</p>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due {gap.dueDate}</span>
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {gap.owner}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                    {getDaysUntilDue(gap.dueDate) < 0
                      ? <span className="text-red-400">{Math.abs(getDaysUntilDue(gap.dueDate))}d overdue</span>
                      : <span>{getDaysUntilDue(gap.dueDate)}d remaining</span>}
                  </span>
                </div>
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">Remediation Progress</span>
                    <span className="font-medium">{gap.progress}%</span>
                  </div>
                  <Progress value={gap.progress} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
