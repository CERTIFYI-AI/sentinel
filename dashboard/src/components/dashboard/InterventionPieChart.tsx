// dashboard/src/components/dashboard/InterventionPieChart.tsx

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CHART_COLORS } from "../../lib/chart-colors";

interface InterventionPieChartProps {
  counts: {
    none: number;
    regen: number;
    upgrade: number;
    hitl: number;
  };
}

const COLORS = [CHART_COLORS.green, CHART_COLORS.blue, CHART_COLORS.amber, CHART_COLORS.red];

export function InterventionPieChart({ counts }: InterventionPieChartProps) {
  const data = [
    { name: "None", value: counts.none },
    { name: "Regen", value: counts.regen },
    { name: "Upgrade", value: counts.upgrade },
    { name: "HITL", value: counts.hitl },
  ].filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Interventions</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}