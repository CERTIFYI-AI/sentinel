import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { cn } from "../../lib/utils";
import { Search, Plus, Eye } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Framework {
  id: string;
  numId: number;
  name: string;
  score: number;
  status: "compliant" | "partial" | "non-compliant";
  controls: number;
  passing: number;
  failing: number;
  gaps: number;
  owner: string;
  lastAudit: string;
  nextAudit: string;
  description: string;
  certification?: string;
}

interface FrameworkControl {
  id: string;
  name: string;
  status: "Implemented" | "Partial" | "Not Implemented";
  score: number;
}

interface FrameworkGap {
  id: string;
  title: string;
  controlRef: string;
  severity: "Critical" | "High" | "Medium";
  dueDate: string;
  owner: string;
}

// ── Seed Data ──────────────────────────────────────────────────────────────────
const frameworks: Framework[] = [
  {
    id: "iso-27001",
    numId: 1,
    name: "ISO 27001",
    score: 87,
    status: "compliant",
    controls: 114,
    passing: 99,
    failing: 15,
    gaps: 3,
    owner: "Sarah Chen",
    lastAudit: "2024-12-01",
    nextAudit: "2026-07-15",
    description: "Information security management system (ISMS) standard. Covers risk assessment, access control, cryptography, operations security, and incident management for AI infrastructure.",
    certification: "Certified (expires 2027-01-14)",
  },
  {
    id: "soc-2",
    numId: 2,
    name: "SOC 2 Type II",
    score: 82,
    status: "compliant",
    controls: 96,
    passing: 79,
    failing: 17,
    gaps: 2,
    owner: "Mike Johnson",
    lastAudit: "2024-11-15",
    nextAudit: "2026-05-20",
    description: "Service Organization Control report covering Security, Availability, Processing Integrity, Confidentiality, and Privacy trust service criteria for AI platform operations.",
    certification: "Type II Report (2025)",
  },
  {
    id: "eu-ai-act",
    numId: 3,
    name: "EU AI Act",
    score: 71,
    status: "partial",
    controls: 68,
    passing: 48,
    failing: 20,
    gaps: 4,
    owner: "Lisa Park",
    lastAudit: "2024-10-28",
    nextAudit: "2026-08-01",
    description: "European Union regulation on artificial intelligence. Requires risk classification, conformity assessments, transparency obligations, and human oversight for high-risk AI systems.",
  },
  {
    id: "nist-ai-rmf",
    numId: 4,
    name: "NIST AI RMF",
    score: 79,
    status: "compliant",
    controls: 82,
    passing: 65,
    failing: 17,
    gaps: 4,
    owner: "David Kim",
    lastAudit: "2024-11-20",
    nextAudit: "2026-07-30",
    description: "Voluntary framework by NIST for managing AI risks across the lifecycle. Covers Govern, Map, Measure, and Manage functions for trustworthy AI development and deployment.",
  },
  {
    id: "owasp-llm",
    numId: 5,
    name: "OWASP LLM Top 10",
    score: 68,
    status: "partial",
    controls: 45,
    passing: 31,
    failing: 14,
    gaps: 3,
    owner: "Anna Lee",
    lastAudit: "2024-09-30",
    nextAudit: "2026-06-10",
    description: "Security risks specific to Large Language Model applications including prompt injection, insecure output handling, training data poisoning, model denial of service, and supply chain vulnerabilities.",
  },
  {
    id: "gdpr",
    numId: 6,
    name: "GDPR AI Provisions",
    score: 91,
    status: "compliant",
    controls: 52,
    passing: 47,
    failing: 5,
    gaps: 2,
    owner: "Tom Brown",
    lastAudit: "2024-12-10",
    nextAudit: "2026-06-15",
    description: "General Data Protection Regulation applied to AI/ML data processing, covering lawful basis, data minimization, DPIA requirements, automated decision-making rights, and cross-border transfers.",
  },
];

const frameworkControlsMap: Record<string, FrameworkControl[]> = {
  "iso-27001": [
    { id: "A.5.1", name: "Information Security Policies", status: "Implemented", score: 100 },
    { id: "A.6.1", name: "Organization of Information Security", status: "Implemented", score: 95 },
    { id: "A.7.1", name: "Human Resource Security — Pre-Employment", status: "Implemented", score: 90 },
    { id: "A.8.1", name: "Asset Management — Responsibility for Assets", status: "Partial", score: 70 },
    { id: "A.9.1", name: "Access Control — Business Requirements", status: "Implemented", score: 88 },
    { id: "A.12.4", name: "Logging and Monitoring", status: "Partial", score: 65 },
    { id: "A.14.2", name: "Security in Development and Support", status: "Implemented", score: 85 },
    { id: "A.18.1", name: "Compliance with Legal Requirements", status: "Implemented", score: 92 },
  ],
  "soc-2": [
    { id: "CC1.1", name: "COSO Principle 1 — Integrity and Ethics", status: "Implemented", score: 95 },
    { id: "CC2.1", name: "COSO Principle 2 — Board Oversight", status: "Implemented", score: 90 },
    { id: "CC3.1", name: "Risk Assessment Process", status: "Partial", score: 75 },
    { id: "CC5.1", name: "Control Activities — Selection and Development", status: "Implemented", score: 88 },
    { id: "CC6.1", name: "Logical and Physical Access Controls", status: "Implemented", score: 92 },
    { id: "CC7.1", name: "System Operations — Change Detection", status: "Partial", score: 68 },
    { id: "CC8.1", name: "Change Management", status: "Implemented", score: 85 },
    { id: "CC9.1", name: "Risk Mitigation", status: "Implemented", score: 82 },
  ],
  "eu-ai-act": [
    { id: "ART-6", name: "High-Risk AI System Classification", status: "Implemented", score: 85 },
    { id: "ART-9", name: "Risk Management System", status: "Partial", score: 72 },
    { id: "ART-10", name: "Data and Data Governance", status: "Partial", score: 65 },
    { id: "ART-11", name: "Technical Documentation", status: "Implemented", score: 80 },
    { id: "ART-13", name: "Transparency and Information to Deployers", status: "Implemented", score: 88 },
    { id: "ART-14", name: "Human Oversight", status: "Partial", score: 60 },
    { id: "ART-15", name: "Accuracy, Robustness, Cybersecurity", status: "Not Implemented", score: 40 },
    { id: "ART-52", name: "Transparency Obligations — AI-Generated Content", status: "Implemented", score: 90 },
  ],
  "nist-ai-rmf": [
    { id: "MAP-1", name: "Context is Established and Understood", status: "Implemented", score: 85 },
    { id: "MAP-3", name: "AI Capabilities, Targeted Usage, Goals Defined", status: "Implemented", score: 90 },
    { id: "MEASURE-1", name: "AI Risks Are Measured Quantitatively", status: "Partial", score: 70 },
    { id: "MEASURE-2", name: "AI Systems Evaluated for Trustworthy Characteristics", status: "Partial", score: 65 },
    { id: "MANAGE-1", name: "AI Risks Are Prioritized and Responded To", status: "Implemented", score: 78 },
    { id: "MANAGE-4", name: "Risk Treatments Are Monitored", status: "Partial", score: 55 },
    { id: "GOVERN-1", name: "Policies, Processes, Procedures Defined", status: "Implemented", score: 92 },
    { id: "GOVERN-6", name: "Workforce Diversity and AI Expertise", status: "Not Implemented", score: 30 },
  ],
  "owasp-llm": [
    { id: "LLM01", name: "Prompt Injection", status: "Implemented", score: 88 },
    { id: "LLM02", name: "Insecure Output Handling", status: "Partial", score: 72 },
    { id: "LLM03", name: "Training Data Poisoning", status: "Implemented", score: 85 },
    { id: "LLM04", name: "Model Denial of Service", status: "Partial", score: 60 },
    { id: "LLM05", name: "Supply Chain Vulnerabilities", status: "Not Implemented", score: 45 },
    { id: "LLM06", name: "Sensitive Information Disclosure", status: "Implemented", score: 90 },
    { id: "LLM07", name: "Insecure Plugin Design", status: "Partial", score: 65 },
    { id: "LLM09", name: "Overreliance", status: "Implemented", score: 80 },
  ],
  "gdpr": [
    { id: "ART-5", name: "Principles Relating to Processing", status: "Implemented", score: 95 },
    { id: "ART-6", name: "Lawfulness of Processing", status: "Implemented", score: 92 },
    { id: "ART-25", name: "Data Protection by Design and Default", status: "Implemented", score: 88 },
    { id: "ART-30", name: "Records of Processing Activities", status: "Implemented", score: 90 },
    { id: "ART-32", name: "Security of Processing", status: "Implemented", score: 93 },
    { id: "ART-33", name: "Notification of Breach to Authority", status: "Partial", score: 75 },
    { id: "ART-35", name: "Data Protection Impact Assessment", status: "Implemented", score: 85 },
    { id: "ART-44", name: "General Principle for Transfers", status: "Partial", score: 70 },
  ],
};

const frameworkGapsMap: Record<string, FrameworkGap[]> = {
  "iso-27001": [
    { id: "GAP-ISO-001", title: "Asset inventory incomplete — 12 AI model assets unclassified", controlRef: "A.8.1", severity: "High", dueDate: "2026-04-30", owner: "James Liu" },
    { id: "GAP-ISO-002", title: "Logging pipeline gap — ML inference logs not forwarded to SIEM", controlRef: "A.12.4", severity: "Critical", dueDate: "2026-04-15", owner: "Priya Sharma" },
    { id: "GAP-ISO-003", title: "Supplier security assessment overdue for 2 AI vendors", controlRef: "A.15.1", severity: "Medium", dueDate: "2026-05-15", owner: "Michael Torres" },
  ],
  "soc-2": [
    { id: "GAP-SOC-001", title: "Risk assessment not updated for new LLM deployment pipeline", controlRef: "CC3.1", severity: "High", dueDate: "2026-04-20", owner: "Sarah Chen" },
    { id: "GAP-SOC-002", title: "Change detection for model weights not instrumented", controlRef: "CC7.1", severity: "Critical", dueDate: "2026-04-10", owner: "David Kim" },
  ],
  "eu-ai-act": [
    { id: "GAP-EU-001", title: "Article 9 risk management system not formalized for HiringFilter Pro", controlRef: "ART-9", severity: "Critical", dueDate: "2026-04-05", owner: "Dr. Anika Patel" },
    { id: "GAP-EU-002", title: "Training data governance documentation incomplete for CreditScorer", controlRef: "ART-10", severity: "High", dueDate: "2026-04-25", owner: "James Liu" },
    { id: "GAP-EU-003", title: "Human oversight mechanism not deployed for high-risk classification", controlRef: "ART-14", severity: "Critical", dueDate: "2026-04-12", owner: "Lisa Wong" },
    { id: "GAP-EU-004", title: "Robustness testing framework not yet implemented", controlRef: "ART-15", severity: "High", dueDate: "2026-05-30", owner: "Raj Patel" },
  ],
  "nist-ai-rmf": [
    { id: "GAP-NIST-001", title: "Quantitative risk measurement tooling not deployed", controlRef: "MEASURE-1", severity: "High", dueDate: "2026-04-30", owner: "Maria Santos" },
    { id: "GAP-NIST-002", title: "Trustworthy AI evaluation criteria incomplete", controlRef: "MEASURE-2", severity: "Medium", dueDate: "2026-05-15", owner: "Dr. Anika Patel" },
    { id: "GAP-NIST-003", title: "Risk treatment monitoring dashboards not built", controlRef: "MANAGE-4", severity: "High", dueDate: "2026-04-18", owner: "David Kim" },
    { id: "GAP-NIST-004", title: "AI workforce diversity assessment not conducted", controlRef: "GOVERN-6", severity: "Medium", dueDate: "2026-06-30", owner: "Sarah Chen" },
  ],
  "owasp-llm": [
    { id: "GAP-OW-001", title: "Insecure output handling — no HTML sanitization on LLM responses", controlRef: "LLM02", severity: "High", dueDate: "2026-04-08", owner: "Priya Sharma" },
    { id: "GAP-OW-002", title: "No rate limiting on model inference endpoints (DoS vector)", controlRef: "LLM04", severity: "Critical", dueDate: "2026-04-05", owner: "James Liu" },
    { id: "GAP-OW-003", title: "Third-party model supply chain not audited", controlRef: "LLM05", severity: "High", dueDate: "2026-05-01", owner: "Michael Torres" },
  ],
  "gdpr": [
    { id: "GAP-GDPR-001", title: "Breach notification SOP not tested in last 12 months", controlRef: "ART-33", severity: "Medium", dueDate: "2026-05-30", owner: "Lisa Wong" },
    { id: "GAP-GDPR-002", title: "Cross-border transfer mechanism needs updating post-DPF review", controlRef: "ART-44", severity: "High", dueDate: "2026-04-20", owner: "Michael Torres" },
  ],
};

// ── Chart Data ──────────────────────────────────────────────────────────────────
const barChartData = [
  { name: "ISO 27001", score: 87, fill: "#10b981" },
  { name: "SOC 2", score: 82, fill: "#3b82f6" },
  { name: "EU AI Act", score: 71, fill: "#8b5cf6" },
  { name: "NIST AI RMF", score: 79, fill: "#f59e0b" },
  { name: "OWASP LLM", score: 68, fill: "#06b6d4" },
  { name: "GDPR", score: 91, fill: "#10b981" },
];

const pieData = [
  { name: "Compliant", value: frameworks.filter(f => f.status === "compliant").length, fill: "#10b981" },
  { name: "Partial", value: frameworks.filter(f => f.status === "partial").length, fill: "#f59e0b" },
  { name: "Non-Compliant", value: frameworks.filter(f => f.status === "non-compliant").length, fill: "#ef4444" },
].filter(d => d.value > 0);

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
  fontSize: "13px",
  border: "1px solid hsl(var(--border))",
};

// ── FrameworkDetailSheet ───────────────────────────────────────────────────────
function FrameworkDetailSheet({
  framework,
  open,
  onOpenChange,
}: {
  framework: Framework | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!framework) return null;
  const controls = frameworkControlsMap[framework.id] ?? [];
  const gaps = frameworkGapsMap[framework.id] ?? [];

  const statusColor = (status: string) => {
    if (status === "Compliant" || status === "Implemented" || status === "compliant") return "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
    if (status === "Partial" || status === "partial") return "text-amber-400 border-amber-500/20 bg-amber-500/10";
    return "text-red-400 border-red-500/20 bg-red-500/10";
  };

  const severityColor = (s: string) => {
    if (s === "Critical") return "text-red-400 border-red-500/20 bg-red-500/10";
    if (s === "High") return "text-amber-400 border-amber-500/20 bg-amber-500/10";
    return "text-blue-400 border-blue-500/20 bg-blue-500/10";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <SheetTitle className="text-lg">{framework.name}</SheetTitle>
            <Badge variant="outline" className={cn("text-xs", statusColor(framework.status))}>
              {framework.status.charAt(0).toUpperCase() + framework.status.slice(1)}
            </Badge>
          </div>
          <SheetDescription className="text-sm text-muted-foreground leading-relaxed">
            {framework.description}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="controls" className="flex-1">Controls</TabsTrigger>
            <TabsTrigger value="gaps" className="flex-1">Gaps ({gaps.length})</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Compliance Score</span>
                <span className="font-semibold">{framework.score}%</span>
              </div>
              <Progress value={framework.score} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Controls", value: framework.controls },
                { label: "Passing", value: framework.passing },
                { label: "Failing", value: framework.failing },
                { label: "Open Gaps", value: framework.gaps },
                { label: "Owner", value: framework.owner },
                { label: "Last Audit", value: framework.lastAudit },
                { label: "Next Audit", value: framework.nextAudit },
                { label: "Certification", value: framework.certification ?? "N/A" },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Controls */}
          <TabsContent value="controls" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground mb-2">{controls.length} controls tracked</p>
            {controls.map(ctrl => (
              <div key={ctrl.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{ctrl.id}</span>
                    <Badge variant="outline" className={cn("text-[10px] h-5", statusColor(ctrl.status))}>
                      {ctrl.status}
                    </Badge>
                  </div>
                  <p className="text-sm truncate">{ctrl.name}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <span className="text-sm font-medium">{ctrl.score}%</span>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Gaps */}
          <TabsContent value="gaps" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground mb-2">{gaps.length} open gaps requiring remediation</p>
            {gaps.map(gap => (
              <div key={gap.id} className="rounded-lg border border-border p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">{gap.id}</span>
                  <Badge variant="outline" className={cn("text-[10px] h-5", severityColor(gap.severity))}>
                    {gap.severity}
                  </Badge>
                </div>
                <p className="text-sm">{gap.title}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                  <span>Control: {gap.controlRef}</span>
                  <span>Due: {gap.dueDate}</span>
                  <span>Owner: {gap.owner}</span>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Frameworks() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = frameworks.filter(f =>
    (filterStatus === "all" || f.status === filterStatus) &&
    f.name.toLowerCase().includes(search.toLowerCase())
  );
  const avgScore = Math.round(frameworks.reduce((a, b) => a + b.score, 0) / frameworks.length);

  const openDetail = (f: Framework) => {
    setSelectedFramework(f);
    setDetailOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Frameworks</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track compliance status across regulatory and security frameworks
          </p>
        </div>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Framework
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{frameworks.length}</div>
            <p className="text-sm text-muted-foreground">Total Frameworks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-500">
              {frameworks.filter(f => f.status === "compliant").length}
            </div>
            <p className="text-sm text-muted-foreground">Compliant</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-500">
              {frameworks.filter(f => f.status === "partial").length}
            </div>
            <p className="text-sm text-muted-foreground">Partial</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{avgScore}%</div>
            <p className="text-sm text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bar Chart — Framework Scores */}
        <Card>
          <CardHeader>
            <CardTitle>Framework Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 30 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value}%`, "Score"]}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart — Compliance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [
                      `${value} framework${value !== 1 ? "s" : ""}`,
                      name,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span style={{ color: "hsl(var(--foreground))", fontSize: "12px" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Frameworks</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  className="pl-8 h-9 border border-border rounded-md text-sm w-64 bg-background"
                  placeholder="Search frameworks..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="h-9 border border-border rounded-md text-sm px-2 bg-background"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="compliant">Compliant</option>
                <option value="partial">Partial</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-muted-foreground font-medium">Framework</th>
                <th className="text-left p-2 text-muted-foreground font-medium">Score</th>
                <th className="text-left p-2 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-2 text-muted-foreground font-medium">Controls</th>
                <th className="text-left p-2 text-muted-foreground font-medium">Gaps</th>
                <th className="text-left p-2 text-muted-foreground font-medium">Owner</th>
                <th className="text-left p-2 text-muted-foreground font-medium">Last Audit</th>
                <th className="p-2 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr
                  key={f.numId}
                  className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => openDetail(f)}
                >
                  <td className="p-2 font-medium">{f.name}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <Progress value={f.score} className="w-20 h-2" />
                      <span>{f.score}%</span>
                    </div>
                  </td>
                  <td className="p-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        f.status === "compliant"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : f.status === "partial"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}
                    >
                      {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="p-2">{f.passing}/{f.controls}</td>
                  <td className="p-2">
                    <span className={cn(f.gaps > 2 ? "text-amber-400" : "text-muted-foreground")}>
                      {f.gaps}
                    </span>
                  </td>
                  <td className="p-2">{f.owner}</td>
                  <td className="p-2 text-muted-foreground">{f.lastAudit}</td>
                  <td className="p-2" onClick={e => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDetail(f)}
                      className="gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <FrameworkDetailSheet
        framework={selectedFramework}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
