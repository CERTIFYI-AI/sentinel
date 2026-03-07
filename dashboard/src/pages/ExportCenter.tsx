import { PageWrapper } from "../components/layout/PageWrapper";
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
