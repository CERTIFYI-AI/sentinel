// dashboard/src/pages/HitlQueue.tsx

import { useHitlQueue } from "../hooks/use-hitl";
import { HitlCard } from "../components/dashboard/HitlCard";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useState } from "react";

export function HitlQueue() {
  const [filter, setFilter] = useState<string | undefined>("pending");
  const { data, isLoading } = useHitlQueue(filter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">HITL Review Queue</h1>
      <Tabs defaultValue="pending" onValueChange={(v) => setFilter(v === "all" ? undefined : v)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value={filter ?? "all"} className="mt-4">
          {isLoading || !data ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <p className="text-muted-foreground">No items in queue.</p>
          ) : (
            <div className="space-y-4">
              {data.items.map((job) => (
                <HitlCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}