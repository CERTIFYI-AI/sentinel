// @ts-nocheck
// dashboard/src/components/dashboard/HitlCard.tsx

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type { HitlJob } from "../../api/types";
import { useReviewHitl } from "../../hooks/use-hitl";

interface HitlCardProps {
  job: HitlJob;
}

export function HitlCard({ job }: HitlCardProps) {
  const [editedResponse, setEditedResponse] = useState("");
  const review = useReviewHitl();

  const priorityColor = {
    low: "secondary" as const,
    medium: "default" as const,
    high: "outline" as const,
    critical: "destructive" as const,
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium truncate max-w-[300px]">{job.prompt}</CardTitle>
          <Badge variant={priorityColor[job.priority]}>{job.priority}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          Trust: {(job.trust_score * 100).toFixed(0)}% | Model: {job.model} | {new Date(job.created_at).toLocaleString()}
        </div>
        <div className="rounded bg-muted p-2 text-xs max-h-24 overflow-y-auto">
          {job.original_response}
        </div>
        <Input
          placeholder="Edit response (optional)"
          value={editedResponse}
          onChange={(e) => setEditedResponse(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => review.mutate({ jobId: job.id, payload: { decision: "approve" } })}
            disabled={review.isPending}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => review.mutate({ jobId: job.id, payload: { decision: "reject" } })}
            disabled={review.isPending}
          >
            Reject
          </Button>
          {editedResponse && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                review.mutate({
                  jobId: job.id,
                  payload: { decision: "edit", edited_response: editedResponse },
                })
              }
              disabled={review.isPending}
            >
              Submit Edit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}