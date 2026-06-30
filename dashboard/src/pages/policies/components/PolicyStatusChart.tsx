import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Policy } from '../../../types/policy.types';
import { useChartTheme } from '../../../hooks/useChartTheme';

const STATUS_COLORS: Record<string, string> = {
  "Published": "hsl(var(--s-ok-tx))", "In Review": "hsl(var(--s-wn-tx))", "Draft": "#3b82f6", "Approved": "hsl(var(--tag-purple))", "Archived": "hsl(var(--text-3))", "Expired": "hsl(var(--s-er-tx))"
};

interface Props { policies: Policy[]; }

export const PolicyStatusChart = ({ policies }: Props) => {
  const ct = useChartTheme();

  const data = Object.entries(
    policies.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const monthlyData = [
    { month: "Oct", reviews: 3 }, { month: "Nov", reviews: 2 }, { month: "Dec", reviews: 5 },
    { month: "Jan", reviews: 6 }, { month: "Feb", reviews: 4 }, { month: "Mar", reviews: 7 }
  ];

  return (
    <div className="bg-[#111] border border-[hsl(var(--border))] rounded-xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Policy Reviews (Last 6 Months)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={monthlyData} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
          <XAxis dataKey="month" tick={{ fill: ct.axis, fontSize: 12 }} />
          <YAxis
            tick={{ fill: ct.axis, fontSize: 12 }}
            label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }}
          />
          <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText }} />
          <Bar dataKey="reviews" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


