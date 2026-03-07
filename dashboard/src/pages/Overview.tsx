// dashboard/src/pages/Overview.tsx

import { useMetrics } from "../hooks/use-metrics";
import { TrustGauge } from "../components/dashboard/TrustGauge";
import { InterventionPieChart } from "../components/dashboard/InterventionPieChart";
import { TrustHistogram } from "../components/dashboard/TrustHistogram";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";

export default function Overview() {
  const { data, isLoading } = useMetrics(24);

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <TrustGauge score={data.average_trust_score} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.total_requests.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">PII Detections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.pii_detection_count.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.average_latency_ms.toFixed(0)}ms</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <InterventionPieChart counts={data.intervention_counts} />
        <TrustHistogram data={data.trust_score_histogram} />
      </div>
    </div>
  );
}