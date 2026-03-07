import os

BASE = "dashboard/src"

def w(path, content):
    fp = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(fp), exist_ok=True)
    with open(fp, "w") as f:
        f.write(content)
    print(f"wrote {fp}")

# ── PageWrapper ──
w("components/layout/PageWrapper.tsx", r"""import { ReactNode } from "react";

interface PageWrapperProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function PageWrapper({ title, description, children, actions }: PageWrapperProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
""")

# ── Enhanced Sidebar with ModuleRail ──
w("components/dashboard/Sidebar.tsx", r"""import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";

const modules = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", path: "/overview", icon: "\u2302" },
    ],
  },
  {
    label: "Trust & Safety",
    items: [
      { name: "Audit Log", path: "/audit-log", icon: "\u2637" },
      { name: "HITL Queue", path: "/hitl-queue", icon: "\u2691" },
      { name: "Incident Log", path: "/incidents", icon: "\u26a0" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { name: "Compliance", path: "/compliance", icon: "\u2611" },
      { name: "Evidence Vault", path: "/evidence", icon: "\u2603" },
      { name: "Policy Editor", path: "/policies", icon: "\u270e" },
    ],
  },
  {
    label: "Risk & Models",
    items: [
      { name: "Model Inventory", path: "/models", icon: "\u2699" },
      { name: "Risk Matrix", path: "/risk-matrix", icon: "\u25a6" },
      { name: "Benchmark", path: "/benchmark", icon: "\u2261" },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Remediation", path: "/remediation", icon: "\u2692" },
      { name: "Export Center", path: "/exports", icon: "\u21e9" },
      { name: "Notifications", path: "/notifications", icon: "\u266a" },
      { name: "Settings", path: "/settings", icon: "\u2699" },
    ],
  },
];

export function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="w-56 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <Link to="/overview" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">Sentinel</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {modules.map((mod) => (
          <div key={mod.label}>
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {mod.label}
            </p>
            <div className="space-y-0.5">
              {mod.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    pathname === item.path
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
""")

# ── RiskHeatMap Component ──
w("components/risk/RiskHeatMap.tsx", r"""import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const LEVELS = ["Critical", "High", "Medium", "Low", "Minimal"] as const;
const LIKELIHOOD = ["Rare", "Unlikely", "Possible", "Likely", "Certain"] as const;

interface RiskCell {
  impact: typeof LEVELS[number];
  likelihood: typeof LIKELIHOOD[number];
  count: number;
}

interface RiskHeatMapProps {
  data: RiskCell[];
}

const colorMap: Record<string, string> = {
  "Critical-Certain": "bg-destructive text-destructive-foreground",
  "Critical-Likely": "bg-destructive text-destructive-foreground",
  "High-Certain": "bg-destructive text-destructive-foreground",
  "High-Likely": "bg-destructive/80 text-destructive-foreground",
  "Medium-Possible": "bg-warning text-warning-foreground",
  "Low-Unlikely": "bg-primary/20 text-primary",
  "Minimal-Rare": "bg-muted text-muted-foreground",
};

function getCellColor(impact: string, likelihood: string): string {
  const key = impact + "-" + likelihood;
  if (colorMap[key]) return colorMap[key];
  const impactIdx = LEVELS.indexOf(impact as typeof LEVELS[number]);
  const likeIdx = LIKELIHOOD.indexOf(likelihood as typeof LIKELIHOOD[number]);
  const score = (4 - impactIdx) + likeIdx;
  if (score >= 6) return "bg-destructive text-destructive-foreground";
  if (score >= 4) return "bg-destructive/60 text-white";
  if (score >= 2) return "bg-warning text-warning-foreground";
  return "bg-muted text-muted-foreground";
}

export function RiskHeatMap({ data }: RiskHeatMapProps) {
  const grid = new Map<string, number>();
  data.forEach((d) => grid.set(d.impact + "-" + d.likelihood, d.count));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Risk Heat Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-1"></th>
                {LIKELIHOOD.map((l) => (
                  <th key={l} className="p-1 text-center font-medium text-muted-foreground">{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((impact) => (
                <tr key={impact}>
                  <td className="p-1 font-medium text-muted-foreground whitespace-nowrap">{impact}</td>
                  {LIKELIHOOD.map((like) => {
                    const count = grid.get(impact + "-" + like) ?? 0;
                    return (
                      <td key={like} className="p-1">
                        <div className={"rounded p-2 text-center font-mono " + getCellColor(impact, like)}>
                          {count}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
""")

# ── EvidenceUploader Component ──
w("components/compliance/EvidenceUploader.tsx", r"""import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface Evidence {
  id: string;
  name: string;
  framework: string;
  controlId: string;
  uploadedAt: string;
  status: "pending" | "verified" | "rejected";
}

interface EvidenceUploaderProps {
  evidence: Evidence[];
  onUpload?: (file: File, framework: string, controlId: string) => void;
}

export function EvidenceUploader({ evidence, onUpload }: EvidenceUploaderProps) {
  const [dragOver, setDragOver] = useState(false);

  const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
    pending: "secondary",
    verified: "default",
    rejected: "destructive",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Evidence Vault</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={"border-2 border-dashed rounded-lg p-8 text-center transition-colors " + (dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25")}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file && onUpload) onUpload(file, "", "");
          }}
        >
          <p className="text-muted-foreground text-sm">Drag and drop evidence files here</p>
          <Button variant="outline" size="sm" className="mt-2">Browse Files</Button>
        </div>
        <div className="space-y-2">
          {evidence.map((e) => (
            <div key={e.id} className="flex items-center justify-between p-2 rounded border">
              <div>
                <p className="text-sm font-medium">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.framework} - {e.controlId}</p>
              </div>
              <Badge variant={statusVariant[e.status]}>{e.status}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
""")

# ── RemediationTimeline Component ──
w("components/compliance/RemediationTimeline.tsx", r"""import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface RemediationItem {
  id: string;
  title: string;
  framework: string;
  controlId: string;
  status: "open" | "in_progress" | "resolved" | "overdue";
  assignee: string;
  dueDate: string;
  createdAt: string;
}

interface RemediationTimelineProps {
  items: RemediationItem[];
}

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  open: "secondary",
  in_progress: "default",
  resolved: "default",
  overdue: "destructive",
};

export function RemediationTimeline({ items }: RemediationTimelineProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Remediation Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 border-l-2 border-muted pl-4 py-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <Badge variant={statusColors[item.status]} className="text-xs">{item.status.replace("_", " ")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.framework} {item.controlId} &middot; {item.assignee} &middot; Due: {item.dueDate}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
""")

# ── PolicyVersionDiff Component ──
w("components/compliance/PolicyVersionDiff.tsx", r"""import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface PolicyVersion {
  version: string;
  content: string;
  updatedAt: string;
  author: string;
}

interface PolicyVersionDiffProps {
  current: PolicyVersion;
  previous?: PolicyVersion;
}

export function PolicyVersionDiff({ current, previous }: PolicyVersionDiffProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Policy Version Diff</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>v{current.version} by {current.author}</span>
            <span>{current.updatedAt}</span>
          </div>
          {previous ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded bg-destructive/10 border text-sm">
                <p className="text-xs font-semibold text-destructive mb-1">Previous (v{previous.version})</p>
                <pre className="whitespace-pre-wrap text-xs">{previous.content}</pre>
              </div>
              <div className="p-3 rounded bg-primary/10 border text-sm">
                <p className="text-xs font-semibold text-primary mb-1">Current (v{current.version})</p>
                <pre className="whitespace-pre-wrap text-xs">{current.content}</pre>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded border text-sm">
              <pre className="whitespace-pre-wrap text-xs">{current.content}</pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
""")

# ── IncidentSeverityBadge ──
w("components/compliance/IncidentSeverityBadge.tsx", r"""import { Badge } from "../ui/badge";

interface IncidentSeverityBadgeProps {
  severity: "critical" | "high" | "medium" | "low" | "info";
}

const variants: Record<string, "default" | "secondary" | "destructive"> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
  info: "secondary",
};

export function IncidentSeverityBadge({ severity }: IncidentSeverityBadgeProps) {
  return <Badge variant={variants[severity]}>{severity.toUpperCase()}</Badge>;
}
""")

# ── BenchmarkSpider ──
w("components/dashboard/BenchmarkSpider.tsx", r"""import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface BenchmarkCategory {
  label: string;
  score: number;
  benchmark: number;
}

interface BenchmarkSpiderProps {
  categories: BenchmarkCategory[];
}

export function BenchmarkSpider({ categories }: BenchmarkSpiderProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Benchmark Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{cat.label}</span>
                <span className="text-muted-foreground">{cat.score}% / {cat.benchmark}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden relative">
                <div className="h-full bg-muted-foreground/30 rounded-full absolute" style={{ width: cat.benchmark + "%" }} />
                <div className="h-full bg-primary rounded-full absolute" style={{ width: cat.score + "%" }} />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-primary rounded" /> Your score</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-muted-foreground/30 rounded" /> Industry avg</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
""")

# ── ExportQueue ──
w("components/dashboard/ExportQueue.tsx", r"""import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface ExportJob {
  id: string;
  name: string;
  format: string;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  size?: string;
}

interface ExportQueueProps {
  jobs: ExportJob[];
  onDownload?: (id: string) => void;
  onRetry?: (id: string) => void;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  queued: "secondary",
  processing: "secondary",
  completed: "default",
  failed: "destructive",
};

export function ExportQueue({ jobs, onDownload, onRetry }: ExportQueueProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Export Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between p-2 rounded border">
              <div>
                <p className="text-sm font-medium">{job.name}</p>
                <p className="text-xs text-muted-foreground">{job.format} &middot; {job.createdAt}{job.size ? " \u00b7 " + job.size : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant[job.status]}>{job.status}</Badge>
                {job.status === "completed" && onDownload && (
                  <Button size="sm" variant="outline" onClick={() => onDownload(job.id)}>Download</Button>
                )}
                {job.status === "failed" && onRetry && (
                  <Button size="sm" variant="outline" onClick={() => onRetry(job.id)}>Retry</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
""")

# ── NotificationFeed ──
w("components/dashboard/NotificationFeed.tsx", r"""import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  createdAt: string;
}

interface NotificationFeedProps {
  notifications: Notification[];
  onMarkRead?: (id: string) => void;
}

const typeVariant: Record<string, "default" | "secondary" | "destructive"> = {
  info: "secondary",
  warning: "default",
  error: "destructive",
  success: "default",
};

export function NotificationFeed({ notifications, onMarkRead }: NotificationFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={"p-3 rounded border cursor-pointer transition-colors " + (n.read ? "opacity-60" : "bg-accent/50")}
              onClick={() => onMarkRead?.(n.id)}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{n.title}</p>
                <Badge variant={typeVariant[n.type]} className="text-xs">{n.type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{n.createdAt}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
""")

# ── ComplianceProgressBar ──
w("components/compliance/ComplianceProgressBar.tsx", r"""import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface FrameworkProgress {
  framework: string;
  pass: number;
  fail: number;
  na: number;
  total: number;
}

interface ComplianceProgressBarProps {
  frameworks: FrameworkProgress[];
}

export function ComplianceProgressBar({ frameworks }: ComplianceProgressBarProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Compliance Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {frameworks.map((fw) => {
            const pct = fw.total > 0 ? Math.round((fw.pass / fw.total) * 100) : 0;
            return (
              <div key={fw.framework} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{fw.framework}</span>
                  <span className="text-muted-foreground">{pct}% ({fw.pass}/{fw.total})</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                  <div className="h-full bg-primary" style={{ width: (fw.pass / fw.total * 100) + "%" }} />
                  <div className="h-full bg-destructive" style={{ width: (fw.fail / fw.total * 100) + "%" }} />
                  <div className="h-full bg-muted-foreground/30" style={{ width: (fw.na / fw.total * 100) + "%" }} />
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-primary rounded" /> Pass</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-destructive rounded" /> Fail</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-muted-foreground/30 rounded" /> N/A</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
""")

# ── ControlStatusGrid ──
w("components/compliance/ControlStatusGrid.tsx", r"""import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface Control {
  id: string;
  name: string;
  status: "PASS" | "FAIL" | "NA";
  signal?: string;
  remediation?: string;
}

interface ControlStatusGridProps {
  controls: Control[];
  framework: string;
}

export function ControlStatusGrid({ controls, framework }: ControlStatusGridProps) {
  const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
    PASS: "default",
    FAIL: "destructive",
    NA: "secondary",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{framework} Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {controls.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-2 rounded hover:bg-accent/50 transition-colors">
              <div className="flex-1">
                <p className="text-sm font-medium">{c.id}: {c.name}</p>
                {c.status === "PASS" && c.signal && <p className="text-xs text-muted-foreground">Signal: {c.signal}</p>}
                {c.status === "FAIL" && c.remediation && <p className="text-xs text-destructive">Fix: {c.remediation}</p>}
                {c.status === "NA" && <p className="text-xs text-muted-foreground">Requires organizational process</p>}
              </div>
              <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
""")

# ── FrameworkSelector ──
w("components/compliance/FrameworkSelector.tsx", r"""import { Badge } from "../ui/badge";

interface Framework {
  id: string;
  name: string;
  type: "mandatory" | "voluntary";
}

interface FrameworkSelectorProps {
  frameworks: Framework[];
  selected: string;
  onSelect: (id: string) => void;
}

export function FrameworkSelector({ frameworks, selected, onSelect }: FrameworkSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {frameworks.map((fw) => (
        <button
          key={fw.id}
          onClick={() => onSelect(fw.id)}
          className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors " +
            (selected === fw.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent")}
        >
          {fw.name}
          <Badge variant={fw.type === "mandatory" ? "destructive" : "secondary"} className="text-xs">
            {fw.type === "mandatory" ? "LAW" : "VOL"}
          </Badge>
        </button>
      ))}
    </div>
  );
}
""")

# ── AuditTrailTable ──
w("components/compliance/AuditTrailTable.tsx", r"""import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  resource: string;
  outcome: "success" | "failure" | "info";
}

interface AuditTrailTableProps {
  entries: AuditEntry[];
}

const outcomeVariant: Record<string, "default" | "secondary" | "destructive"> = {
  success: "default",
  failure: "destructive",
  info: "secondary",
};

export function AuditTrailTable({ entries }: AuditTrailTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Audit Trail</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium text-muted-foreground">Time</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Action</th>
                <th className="text-left p-2 font-medium text-muted-foreground">User</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Resource</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{e.timestamp}</td>
                  <td className="p-2">{e.action}</td>
                  <td className="p-2 text-muted-foreground">{e.user}</td>
                  <td className="p-2 text-muted-foreground">{e.resource}</td>
                  <td className="p-2"><Badge variant={outcomeVariant[e.outcome]}>{e.outcome}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
""")

# ──────── PAGES ────────

# ── Risk Matrix Page ──
w("pages/RiskMatrix.tsx", r"""import { PageWrapper } from "../components/layout/PageWrapper";
import { RiskHeatMap } from "../components/risk/RiskHeatMap";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const sampleData = [
  { impact: "Critical" as const, likelihood: "Likely" as const, count: 2 },
  { impact: "High" as const, likelihood: "Possible" as const, count: 5 },
  { impact: "Medium" as const, likelihood: "Likely" as const, count: 8 },
  { impact: "Low" as const, likelihood: "Certain" as const, count: 3 },
  { impact: "Minimal" as const, likelihood: "Rare" as const, count: 12 },
  { impact: "Critical" as const, likelihood: "Rare" as const, count: 1 },
  { impact: "High" as const, likelihood: "Unlikely" as const, count: 4 },
];

export default function RiskMatrix() {
  return (
    <PageWrapper title="Risk Matrix" description="AI risk assessment heat map across all models and operations">
      <div className="grid gap-4 md:grid-cols-2">
        <RiskHeatMap data={sampleData} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Critical risks</span><span className="font-bold text-destructive">3</span></div>
              <div className="flex justify-between"><span>High risks</span><span className="font-bold">9</span></div>
              <div className="flex justify-between"><span>Medium risks</span><span className="font-bold">8</span></div>
              <div className="flex justify-between"><span>Low / Minimal</span><span className="text-muted-foreground">15</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
""")

# ── Evidence Vault Page ──
w("pages/EvidenceVault.tsx", r"""import { PageWrapper } from "../components/layout/PageWrapper";
import { EvidenceUploader } from "../components/compliance/EvidenceUploader";
import { Button } from "../components/ui/button";

const sampleEvidence = [
  { id: "1", name: "pii-scan-report-q4.pdf", framework: "GDPR", controlId: "Art.35", uploadedAt: "2025-01-15", status: "verified" as const },
  { id: "2", name: "bias-audit-gpt4o.json", framework: "EU AI Act", controlId: "Art.9", uploadedAt: "2025-01-14", status: "pending" as const },
  { id: "3", name: "model-card-v2.md", framework: "NIST AI RMF", controlId: "MAP-1.1", uploadedAt: "2025-01-13", status: "verified" as const },
  { id: "4", name: "incident-response-plan.docx", framework: "ISO 42001", controlId: "A.6.2", uploadedAt: "2025-01-12", status: "rejected" as const },
];

export default function EvidenceVault() {
  return (
    <PageWrapper
      title="Evidence Vault"
      description="Upload and manage compliance evidence across all frameworks"
      actions={<Button>Upload Evidence</Button>}
    >
      <EvidenceUploader evidence={sampleEvidence} />
    </PageWrapper>
  );
}
""")

# ── Remediation Tracker Page ──
w("pages/RemediationTracker.tsx", r"""import { PageWrapper } from "../components/layout/PageWrapper";
import { RemediationTimeline } from "../components/compliance/RemediationTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const sampleItems = [
  { id: "1", title: "Enable PII detection on all endpoints", framework: "GDPR", controlId: "Art.32", status: "in_progress" as const, assignee: "DevOps Team", dueDate: "2025-02-01", createdAt: "2025-01-10" },
  { id: "2", title: "Implement bias testing pipeline", framework: "EU AI Act", controlId: "Art.9", status: "open" as const, assignee: "ML Team", dueDate: "2025-02-15", createdAt: "2025-01-12" },
  { id: "3", title: "Update model transparency docs", framework: "NIST AI RMF", controlId: "GOV-1.2", status: "overdue" as const, assignee: "Compliance", dueDate: "2025-01-05", createdAt: "2024-12-20" },
  { id: "4", title: "Configure data retention policy", framework: "GDPR", controlId: "Art.5", status: "resolved" as const, assignee: "Data Team", dueDate: "2025-01-20", createdAt: "2025-01-01" },
];

export default function RemediationTracker() {
  return (
    <PageWrapper title="Remediation Tracker" description="Track and manage compliance remediation tasks">
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Open</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">2</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Overdue</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-destructive">1</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Resolved</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">1</p></CardContent></Card>
      </div>
      <RemediationTimeline items={sampleItems} />
    </PageWrapper>
  );
}
""")

# ── Policy Editor Page ──
w("pages/PolicyEditor.tsx", r"""import { useState } from "react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { PolicyVersionDiff } from "../components/compliance/PolicyVersionDiff";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

const samplePolicies = [
  { id: "1", name: "AI Usage Policy", version: "2.1", updatedAt: "2025-01-15", author: "Compliance Team" },
  { id: "2", name: "Data Retention Policy", version: "1.3", updatedAt: "2025-01-10", author: "Legal" },
  { id: "3", name: "Model Deployment Policy", version: "3.0", updatedAt: "2025-01-08", author: "ML Ops" },
];

export default function PolicyEditor() {
  const [selected, setSelected] = useState(samplePolicies[0]);
  return (
    <PageWrapper title="Policy Editor" description="Create and manage governance policies" actions={<Button>New Policy</Button>}>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {samplePolicies.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={"w-full text-left p-2 rounded text-sm transition-colors " + (selected.id === p.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs opacity-70">v{p.version} &middot; {p.updatedAt}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="md:col-span-2">
          <PolicyVersionDiff
            current={{ version: selected.version, content: "This policy governs the use of AI systems within the organization. All deployments must pass compliance checks before production release.", updatedAt: selected.updatedAt, author: selected.author }}
            previous={{ version: "1.0", content: "This policy governs AI usage. Deployments require approval.", updatedAt: "2024-12-01", author: "Admin" }}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
""")

# ── Incident Log Page ──
w("pages/IncidentLog.tsx", r"""import { PageWrapper } from "../components/layout/PageWrapper";
import { IncidentSeverityBadge } from "../components/compliance/IncidentSeverityBadge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

const sampleIncidents = [
  { id: "INC-001", title: "PII detected in model output", severity: "critical" as const, status: "investigating", reportedAt: "2025-01-15 14:30", assignee: "Security Team" },
  { id: "INC-002", title: "Model hallucination in legal responses", severity: "high" as const, status: "mitigated", reportedAt: "2025-01-14 09:15", assignee: "ML Team" },
  { id: "INC-003", title: "Bias detected in hiring model", severity: "high" as const, status: "open", reportedAt: "2025-01-13 16:45", assignee: "Ethics Board" },
  { id: "INC-004", title: "Latency spike on inference endpoint", severity: "medium" as const, status: "resolved", reportedAt: "2025-01-12 11:00", assignee: "DevOps" },
  { id: "INC-005", title: "Model version mismatch in staging", severity: "low" as const, status: "resolved", reportedAt: "2025-01-11 08:30", assignee: "Release Eng" },
];

export default function IncidentLog() {
  return (
    <PageWrapper title="Incident Log" description="Track and manage AI safety incidents" actions={<Button>Report Incident</Button>}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sampleIncidents.map((inc) => (
              <div key={inc.id} className="flex items-center justify-between p-3 rounded border">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{inc.id}</span>
                    <p className="text-sm font-medium">{inc.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{inc.reportedAt} &middot; {inc.assignee} &middot; {inc.status}</p>
                </div>
                <IncidentSeverityBadge severity={inc.severity} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
""")

# ── Benchmark Page ──
w("pages/Benchmark.tsx", r"""import { PageWrapper } from "../components/layout/PageWrapper";
import { BenchmarkSpider } from "../components/dashboard/BenchmarkSpider";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const categories = [
  { label: "Transparency", score: 82, benchmark: 65 },
  { label: "Fairness", score: 71, benchmark: 70 },
  { label: "Safety", score: 90, benchmark: 75 },
  { label: "Privacy", score: 68, benchmark: 72 },
  { label: "Accountability", score: 85, benchmark: 60 },
  { label: "Robustness", score: 76, benchmark: 68 },
];

export default function Benchmark() {
  return (
    <PageWrapper title="Benchmark" description="Compare your AI governance posture against industry benchmarks">
      <div className="grid gap-4 md:grid-cols-2">
        <BenchmarkSpider categories={categories} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-5xl font-bold text-primary">78</p>
              <p className="text-sm text-muted-foreground mt-2">out of 100</p>
              <p className="text-xs text-muted-foreground mt-1">Industry average: 68</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
""")

# ── Export Center Page ──
w("pages/ExportCenter.tsx", r"""import { PageWrapper } from "../components/layout/PageWrapper";
import { ExportQueue } from "../components/dashboard/ExportQueue";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const sampleJobs = [
  { id: "1", name: "GDPR Compliance Report", format: "PDF", status: "completed" as const, createdAt: "2025-01-15 10:00", size: "2.4 MB" },
  { id: "2", name: "EU AI Act Audit Export", format: "CSV", status: "processing" as const, createdAt: "2025-01-15 10:15" },
  { id: "3", name: "Full Model Inventory", format: "JSON", status: "queued" as const, createdAt: "2025-01-15 10:20" },
  { id: "4", name: "Risk Assessment Q4", format: "PDF", status: "failed" as const, createdAt: "2025-01-14 16:00" },
];

const templates = [
  { name: "Compliance Summary", description: "All frameworks overview" },
  { name: "Audit Report", description: "Detailed control-by-control" },
  { name: "Risk Register", description: "All identified risks" },
  { name: "Model Inventory", description: "All registered models" },
];

export default function ExportCenter() {
  return (
    <PageWrapper title="Export Center" description="Generate and download compliance reports">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Report Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.name} className="flex items-center justify-between p-2 rounded border">
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                  <Button size="sm" variant="outline">Generate</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <ExportQueue jobs={sampleJobs} />
      </div>
    </PageWrapper>
  );
}
""")

# ── Notifications Page ──
w("pages/Notifications.tsx", r"""import { PageWrapper } from "../components/layout/PageWrapper";
import { NotificationFeed } from "../components/dashboard/NotificationFeed";
import { Button } from "../components/ui/button";

const sampleNotifications = [
  { id: "1", title: "Compliance scan completed", message: "EU AI Act framework scan finished with 3 new findings", type: "info" as const, read: false, createdAt: "2 min ago" },
  { id: "2", title: "Critical incident reported", message: "PII detected in model output - INC-001 created", type: "error" as const, read: false, createdAt: "15 min ago" },
  { id: "3", title: "Remediation overdue", message: "GOV-1.2 transparency docs update is past due date", type: "warning" as const, read: false, createdAt: "1 hour ago" },
  { id: "4", title: "Model registered", message: "GPT-4o-mini added to model inventory", type: "success" as const, read: true, createdAt: "3 hours ago" },
  { id: "5", title: "Export ready", message: "GDPR Compliance Report PDF is ready for download", type: "info" as const, read: true, createdAt: "5 hours ago" },
];

export default function Notifications() {
  return (
    <PageWrapper title="Notifications" description="Stay updated on compliance events" actions={<Button variant="outline">Mark All Read</Button>}>
      <NotificationFeed notifications={sampleNotifications} />
    </PageWrapper>
  );
}
""")

# ──────── Updated App.tsx ────────
w("App.tsx", r"""import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/dashboard/Sidebar";
import { TopBar } from "./components/dashboard/TopBar";
import { ThemeProvider } from "./components/theme-provider";
import Overview from "./pages/Overview";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import AuditLog from "./pages/AuditLog";
import HitlQueue from "./pages/HitlQueue";
import ModelInventory from "./pages/ModelInventory";
import Settings from "./pages/Settings";
import RiskMatrix from "./pages/RiskMatrix";
import EvidenceVault from "./pages/EvidenceVault";
import RemediationTracker from "./pages/RemediationTracker";
import PolicyEditor from "./pages/PolicyEditor";
import IncidentLog from "./pages/IncidentLog";
import Benchmark from "./pages/Benchmark";
import ExportCenter from "./pages/ExportCenter";
import Notifications from "./pages/Notifications";

function ProtectedLayout() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="sentinel-theme">
      <BrowserRouter>
        <Routes>
          <Route element={<ProtectedLayout />}>
            <Route path="/overview" element={<Overview />} />
            <Route path="/compliance" element={<ComplianceDashboard />} />
            <Route path="/audit-log" element={<AuditLog />} />
            <Route path="/hitl-queue" element={<HitlQueue />} />
            <Route path="/models" element={<ModelInventory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/risk-matrix" element={<RiskMatrix />} />
            <Route path="/evidence" element={<EvidenceVault />} />
            <Route path="/remediation" element={<RemediationTracker />} />
            <Route path="/policies" element={<PolicyEditor />} />
            <Route path="/incidents" element={<IncidentLog />} />
            <Route path="/benchmark" element={<Benchmark />} />
            <Route path="/exports" element={<ExportCenter />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
""")

print("\n=== Phase 2 UI Expansion Complete ===")
print("Files generated successfully.")
