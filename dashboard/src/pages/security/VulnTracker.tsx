import { useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bug, AlertTriangle, ShieldAlert, Clock, Filter, ArrowUpDown } from "lucide-react";

interface Vulnerability {
  id: string;
  title: string;
  cve: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "patched" | "accepted";
  asset: string;
  discovered: string;
  cvss: number;
  description: string;
}

const VULNS: Vulnerability[] = [
  { id: "V-001", title: "Remote Code Execution in API Gateway", cve: "CVE-2024-1234", severity: "critical", status: "open", asset: "api-gateway-prod", discovered: "2024-01-15", cvss: 9.8, description: "Unauthenticated RCE via crafted HTTP headers" },
  { id: "V-002", title: "SQL Injection in User Search", cve: "CVE-2024-1235", severity: "critical", status: "in_progress", asset: "user-service", discovered: "2024-01-14", cvss: 9.1, description: "Blind SQL injection in search parameter" },
  { id: "V-003", title: "XSS in Dashboard Comments", cve: "CVE-2024-1236", severity: "high", status: "open", asset: "dashboard-frontend", discovered: "2024-01-13", cvss: 7.5, description: "Stored XSS through comment markdown rendering" },
  { id: "V-004", title: "Insecure Deserialization", cve: "CVE-2024-1237", severity: "high", status: "patched", asset: "worker-service", discovered: "2024-01-12", cvss: 7.2, description: "Java deserialization vulnerability in job queue" },
  { id: "V-005", title: "SSRF in Webhook Handler", cve: "CVE-2024-1238", severity: "high", status: "in_progress", asset: "webhook-service", discovered: "2024-01-11", cvss: 7.0, description: "Server-side request forgery via webhook URL" },
  { id: "V-006", title: "Weak TLS Configuration", cve: "CVE-2024-1239", severity: "medium", status: "open", asset: "load-balancer", discovered: "2024-01-10", cvss: 5.3, description: "TLS 1.0/1.1 still enabled on public endpoints" },
  { id: "V-007", title: "Information Disclosure in Error Pages", cve: "CVE-2024-1240", severity: "medium", status: "accepted", asset: "web-server", discovered: "2024-01-09", cvss: 4.3, description: "Stack traces exposed in 500 error responses" },
  { id: "V-008", title: "Missing Rate Limiting", cve: "CVE-2024-1241", severity: "low", status: "open", asset: "auth-service", discovered: "2024-01-08", cvss: 3.7, description: "No rate limiting on password reset endpoint" },
  { id: "V-009", title: "Outdated Dependencies", cve: "CVE-2024-1242", severity: "low", status: "patched", asset: "backend-api", discovered: "2024-01-07", cvss: 3.1, description: "Multiple npm packages with known vulnerabilities" },
];

const SEV_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  open: "destructive",
  in_progress: "default",
  patched: "secondary",
  accepted: "outline",
};

export default function VulnTracker() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"cvss" | "discovered">("cvss");

  const filtered = severityFilter === "all" ? VULNS : VULNS.filter(v => v.severity === severityFilter);
  const sorted = [...filtered].sort((a, b) => sortBy === "cvss" ? b.cvss - a.cvss : new Date(b.discovered).getTime() - new Date(a.discovered).getTime());

  const critCount = VULNS.filter(v => v.severity === "critical").length;
  const highCount = VULNS.filter(v => v.severity === "high").length;
  const openCount = VULNS.filter(v => v.status === "open").length;
  const avgCvss = (VULNS.reduce((s, v) => s + v.cvss, 0) / VULNS.length).toFixed(1);

  return (
    <PageWrapper title="Vulnerability Tracker" subtitle="Track, prioritize, and remediate security vulnerabilities across all assets">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-slate-100">{critCount}</p>
                <p className="text-xs text-slate-500">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-slate-100">{highCount}</p>
                <p className="text-xs text-slate-500">High</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bug className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-slate-100">{openCount}</p>
                <p className="text-xs text-slate-500">Open Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-slate-100">{avgCvss}</p>
                <p className="text-xs text-slate-500">Avg CVSS</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {["all", "critical", "high", "medium", "low"].map(sev => (
            <Button key={sev} size="sm" variant={severityFilter === sev ? "default" : "outline"} onClick={() => setSeverityFilter(sev)} className="capitalize text-xs">
              {sev}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => setSortBy(s => s === "cvss" ? "discovered" : "cvss")} className="gap-1">
          <ArrowUpDown className="h-3 w-3" />{sortBy === "cvss" ? "CVSS Score" : "Date"}
        </Button>
      </div>

      <div className="space-y-3">
        {sorted.map(vuln => (
          <Card key={vuln.id} className="bg-slate-900 border-slate-800">
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded border ${SEV_COLORS[vuln.severity]}`}>{vuln.severity.toUpperCase()}</span>
                    <h4 className="text-sm font-semibold text-slate-100">{vuln.title}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{vuln.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="font-mono">{vuln.cve}</span>
                    <span>Asset: {vuln.asset}</span>
                    <span>CVSS: <span className="text-slate-300 font-semibold">{vuln.cvss}</span></span>
                    <span>Found: {vuln.discovered}</span>
                  </div>
                </div>
                <Badge variant={STATUS_COLORS[vuln.status] as any} className="text-xs ml-4">
                  {vuln.status.replace("_", " ")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
