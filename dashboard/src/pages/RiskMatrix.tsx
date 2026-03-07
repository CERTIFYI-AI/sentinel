import { PageWrapper } from "../components/layout/PageWrapper";
import { RiskHeatMap } from "../components/risk/RiskHeatMap";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const sampleData = [
  { impact: "Critical" as const, likelihood: "Likely" as const, count: 2 },
  { impact: "High" as const, likelihood: "Possible" as const, count: 5 },
  { impact: "Medium" as const, likelihood: "Likely" as const, count: 8 },
  { impact: "Low" as const, likelihood: "Certain" as const, count: 3 },
  { impact: "Minimal" as const, likelihood: "Rare" as const, count: 12 },
  { impact: "Critical" as const, likelihood: "Rare" as const, count: 1 },
  { impact: "High" as const, likelihood: "Unlikely" as const, count: 4 },
];

export default function RiskMatrix() {
  return (
    <PageWrapper title="Risk Matrix" description="AI risk assessment heat map across all models and operations">
      <div className="grid gap-4 md:grid-cols-2">
        <RiskHeatMap data={sampleData} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Critical risks</span><span className="font-bold text-destructive">3</span></div>
              <div className="flex justify-between"><span>High risks</span><span className="font-bold">9</span></div>
              <div className="flex justify-between"><span>Medium risks</span><span className="font-bold">8</span></div>
              <div className="flex justify-between"><span>Low / Minimal</span><span className="text-muted-foreground">15</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
