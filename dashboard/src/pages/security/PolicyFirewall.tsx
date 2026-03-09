import { useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Plus, RefreshCw } from "lucide-react";

interface Policy {
  id: string;
  name: string;
  description: string;
  category: "access" | "data" | "network" | "compliance";
  status: "active" | "inactive" | "violation";
  lastUpdated: string;
  enforced: boolean;
  violations: number;
}

const POLICIES: Policy[] = [
  { id: "POL-001", name: "MFA Enforcement", description: "Require multi-factor authentication for all admin accounts", category: "access", status: "active", lastUpdated: "2024-01-15", enforced: true, violations: 0 },
  { id: "POL-002", name: "Data Encryption at Rest", description: "All sensitive data must be encrypted using AES-256", category: "data", status: "active", lastUpdated: "2024-01-14", enforced: true, violations: 2 },
  { id: "POL-003", name: "Egress Filtering", description: "Block unauthorized outbound connections to unknown IPs", category: "network", status: "active", lastUpdated: "2024-01-13", enforced: true, violations: 5 },
  { id: "POL-004", name: "GDPR Data Retention", description: "Auto-delete personal data after 90-day retention period", category: "compliance", status: "violation", lastUpdated: "2024-01-12", enforced: true, violations: 12 },
  { id: "POL-005", name: "API Rate Limiting", description: "Enforce rate limits on all public-facing API endpoints", category: "network", status: "active", lastUpdated: "2024-01-11", enforced: true, violations: 1 },
  { id: "POL-006", name: "Password Complexity", description: "Minimum 12 chars with uppercase, lowercase, number, symbol", category: "access", status: "active", lastUpdated: "2024-01-10", enforced: true, violations: 3 },
  { id: "POL-007", name: "PII Masking", description: "Mask personally identifiable information in logs and exports", category: "data", status: "inactive", lastUpdated: "2024-01-09", enforced: false, violations: 0 },
  { id: "POL-008", name: "SOC 2 Audit Trail", description: "Maintain complete audit logs for all system changes", category: "compliance", status: "active", lastUpdated: "2024-01-08", enforced: true, violations: 0 },
];

const CATEGORY_COLORS: Record<string, string> = {
  access: "text-blue-400",
  data: "text-purple-400",
  network: "text-orange-400",
  compliance: "text-green-400",
};

export default function PolicyFirewall() {
  const [policies, setPolicies] = useState(POLICIES);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? policies : policies.filter(p => p.category === filter);
  const activeCount = policies.filter(p => p.status === "active").length;
  const violationCount = policies.filter(p => p.status === "violation").length;
  const totalViolations = policies.reduce((sum, p) => sum + p.violations, 0);

  const toggleEnforcement = (id: string) => {
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, enforced: !p.enforced, status: !p.enforced ? "active" : "inactive" } : p));
  };

  return (
    <PageWrapper title="Policy Firewall" subtitle="Define, enforce, and monitor security policies across your infrastructure">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-slate-100">{activeCount}</p>
                <p className="text-xs text-slate-500">Active Policies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-slate-100">{violationCount}</p>
                <p className="text-xs text-slate-500">In Violation</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldX className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-slate-100">{totalViolations}</p>
                <p className="text-xs text-slate-500">Total Violations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-slate-100">{policies.length}</p>
                <p className="text-xs text-slate-500">Total Policies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {["all", "access", "data", "network", "compliance"].map(cat => (
            <Button key={cat} size="sm" variant={filter === cat ? "default" : "outline"} onClick={() => setFilter(cat)} className="capitalize text-xs">
              {cat}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1"><RefreshCw className="h-3 w-3" />Sync</Button>
          <Button size="sm" className="gap-1"><Plus className="h-3 w-3" />Add Policy</Button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(policy => (
          <Card key={policy.id} className="bg-slate-900 border-slate-800">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-slate-500">{policy.id}</span>
                    <h4 className="text-sm font-semibold text-slate-100">{policy.name}</h4>
                    <Badge variant={policy.status === "active" ? "default" : policy.status === "violation" ? "destructive" : "secondary"} className="text-xs">
                      {policy.status}
                    </Badge>
                    <span className={`text-xs capitalize ${CATEGORY_COLORS[policy.category]}`}>{policy.category}</span>
                  </div>
                  <p className="text-xs text-slate-500">{policy.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span>Updated: {policy.lastUpdated}</span>
                    {policy.violations > 0 && <span className="text-red-400">{policy.violations} violations</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Enforced</span>
                  <Switch checked={policy.enforced} onCheckedChange={() => toggleEnforcement(policy.id)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
