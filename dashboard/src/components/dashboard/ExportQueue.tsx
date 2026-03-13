import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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
                <p className="text-xs text-gray-500">{job.format} &middot; {job.createdAt}{job.size ? " \u00b7 " + job.size : ""}</p>
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
