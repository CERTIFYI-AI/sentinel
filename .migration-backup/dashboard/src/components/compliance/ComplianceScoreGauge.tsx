import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface Props {
  score: number;
  label: string;
}

// NOTE: Never use Tailwind color classes in Recharts props - use hex values directly
const getColor = (score: number): string => {
  if (score >= 80) return '#16a34a'; // green-600
  if (score >= 60) return '#d97706'; // amber-600
  return '#dc2626'; // red-600
};

export function ComplianceScoreGauge({ score, label }: Props) {
  const color = getColor(score);
  const data = [{ value: score, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={120} height={120}>
        <RadialBarChart
          cx="50%" cy="50%"
          innerRadius="60%" outerRadius="90%"
          startAngle={90} endAngle={90 - 360 * (score / 100)}
          data={data}
        >
          <RadialBar dataKey="value" cornerRadius={4} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="mt-1 text-center">
        <div className="text-2xl font-bold text-foreground" style={{ color }}>{score.toFixed(0)}%</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}
