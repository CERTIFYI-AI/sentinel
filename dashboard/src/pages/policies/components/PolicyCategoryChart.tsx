import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Policy } from '../../../types/policy.types';

const COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#a855f7'];

interface Props { policies: Policy[]; }

export const PolicyCategoryChart = ({ policies }: Props) => {
  const data = Object.entries(
    policies.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.replace(" & ", " &\n"), value }));

  return (
    <div className="bg-[#111] border border-[hsl(var(--border))] rounded-xl p-6">
      <h3 className="text-sm font-semibold text-white mb-4">Policies by Category</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart key="category-pie">
          <Pie data={data} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
            {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: "8px", color: "#e2e8f0" }} />
          <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: "11px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
