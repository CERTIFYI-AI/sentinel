// dashboard/src/pages/AuditLog.tsx

import { useState } from "react";
import { useAuditLog } from "../hooks/use-audit";
import { AuditTable } from "../components/dashboard/AuditTable";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLog(page);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      {isLoading || !data ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <AuditTable entries={data.items} />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.page} of {data.total_pages} ({data.total} entries)
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page >= data.total_pages}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}