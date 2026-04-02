import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Policy } from '../../../types/policy.types';

const STATUS_COLORS: Record<string, string> = {
  "Published": "#10b981", "In Review": "#f59e0b", "Draft": "#3b82f6", "Approved": "#8b5cf6", "Archived": "#6b7280", "Expired": "#ef4444"
};

interface Props { policies: Policy[]; }

export const PolicyStatusChart = ({ policies }: Props) => {
  const data = Object.entries(
    policies.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const monthlyData = [
    { month: "Oct", reviews: 3 }, { month: "Nov", reviews: 2 }, { month: "Dec", reviews: 5 },
    { month: "Jan", reviews: 6 }, { month: "Feb", reviews: 4 }, { month: "Mar", reviews: 7 }
  ];

  return (
    <div className="bg-[#111] border border-[hsl(var(--border))] rounded-xl p-6">
      <h3 className="text-sm font-semibold text-white mb-4">Policy Reviews (Last 6 Months)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={monthlyData} barSize={28}>
          <XAxis dataKey="month" stroke="#52525b" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
          <YAxis stroke="#52525b" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
          <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: "8px", color: "#e2e8f0" }} />
          <Bar dataKey="reviews" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
