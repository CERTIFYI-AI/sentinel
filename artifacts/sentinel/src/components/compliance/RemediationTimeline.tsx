// @ts-nocheck
import type { BadgeVariant } from '../../lib/compliance-types';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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
