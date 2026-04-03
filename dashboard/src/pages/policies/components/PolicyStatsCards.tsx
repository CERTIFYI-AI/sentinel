import { FileText, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { Policy } from '../../../types/policy.types';

interface Props { policies: Policy[]; }

export const PolicyStatsCards = ({ policies }: Props) => {
  const total = policies.length;
  const published = policies.filter(p => p.status === 'Published').length;
  const inReview = policies.filter(p => p.status === 'In Review').length;
  const draft = policies.filter(p => p.status === 'Draft').length;
  const expired = policies.filter(p => p.status === 'Expired').length;
  const approved = policies.filter(p => p.status === 'Approved').length;
  const critical = policies.filter(p => p.priority === 'Critical').length;

  const cards = [
    { label: 'Total Policies', value: total, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'Published', value: published, icon: CheckCircle, color: 'text-[hsl(var(--brand))]', bg: 'bg-[hsl(var(--brand))]/10', border: 'border-emerald-500/20' },
    { label: 'In Review', value: inReview, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'Draft', value: draft, icon: AlertTriangle, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    { label: 'Expired', value: expired, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    { label: 'Critical Priority', value: critical, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-xl border ${card.border} ${card.bg} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[hsl(var(--text-3))] font-medium">{card.label}</span>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </div>
          <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
};

export default PolicyStatsCards;
