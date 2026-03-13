import { PageWrapper } from "../components/layout/PageWrapper";
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
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Resolved</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-[#1A6B5A]">1</p></CardContent></Card>
      </div>
      <RemediationTimeline items={sampleItems} />
    </PageWrapper>
  );
}
