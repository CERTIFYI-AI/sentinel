import { PageWrapper } from "../components/layout/PageWrapper";
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
