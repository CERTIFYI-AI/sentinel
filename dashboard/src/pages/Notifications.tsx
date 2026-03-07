import { PageWrapper } from "../components/layout/PageWrapper";
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
