// @ts-nocheck
// dashboard/src/components/dashboard/TrustGauge.tsx

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CHART_COLORS } from "../../lib/chart-colors";

interface TrustGaugeProps {
  score: number;
}

export function TrustGauge({ score }: TrustGaugeProps) {
  const percentage = Math.round(score * 100);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 80 ? CHART_COLORS.green : percentage >= 50 ? CHART_COLORS.amber : CHART_COLORS.red;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Avg Trust Score</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <div className="relative h-32 w-32">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
            {percentage}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}