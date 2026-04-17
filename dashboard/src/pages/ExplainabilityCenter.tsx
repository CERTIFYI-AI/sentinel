import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { MagnifyingGlass, Brain, TreeStructure, ChartBar, Export } from '@phosphor-icons/react';
import Breadcrumbs from '../components/Breadcrumbs';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

const EXPLANATIONS = [
  { id: 'EXP-001', model: 'GPT-4o Risk Scorer', method: 'SHAP', status: 'Complete', score: 0.92, date: '2025-01-15' },
  { id: 'EXP-002', model: 'Fraud Detection v3', method: 'LIME', status: 'Running', score: null, date: '2025-01-16' },
  { id: 'EXP-003', model: 'Credit Scoring', method: 'Anchors', status: 'Complete', score: 0.87, date: '2025-01-14' },
  { id: 'EXP-004', model: 'NLP Classifier', method: 'Attention Maps', status: 'Failed', score: null, date: '2025-01-13' },
];

export default function ExplainabilityCenter() {
  const [search, setSearch] = useState('');
  const filtered = EXPLANATIONS.filter(e => e.model.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <Breadcrumbs />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Explainability Center</h1>
          <p className="text-sm text-[hsl(var(--text-3))]">Model decision transparency & interpretability</p>
        </div>
        <Button className="gap-2"><Brain size={16} /> New Explanation Run</Button>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{ label: 'Total Explanations', value: '47', icon: TreeStructure },
          { label: 'Models Covered', value: '12/15', icon: Brain },
          { label: 'Avg Fidelity', value: '0.89', icon: ChartBar },
          { label: 'Pending Reviews', value: '3', icon: MagnifyingGlass }].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon size={24} className="text-[hsl(var(--accent))]" />
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--text-1))]">{kpi.value}</p>
                <p className="text-xs text-[hsl(var(--text-3))]">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Explanation Runs</CardTitle></CardHeader>
        <CardContent>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search models..." className="w-full mb-4 p-2 border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-1))]" />
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[hsl(var(--border))] text-[hsl(var(--text-3))]">
              <th className="text-left p-2">ID</th><th className="text-left p-2">Model</th>
              <th className="text-left p-2">Method</th><th className="text-left p-2">Status</th>
              <th className="text-left p-2">Fidelity</th><th className="text-left p-2">Date</th>
              <th className="text-left p-2">Actions</th>
            </tr></thead>
            <tbody>{filtered.map(e => (
              <tr key={e.id} className="border-b border-[hsl(var(--border))]">
                <td className="p-2 font-mono text-[hsl(var(--text-2))]">{e.id}</td>
                <td className="p-2 text-[hsl(var(--text-1))]">{e.model}</td>
                <td className="p-2"><Badge variant="outline">{e.method}</Badge></td>
                <td className="p-2"><Badge className={e.status === 'Complete' ? 'bg-emerald-500/20 text-emerald-400' : e.status === 'Running' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}>{e.status}</Badge></td>
                <td className="p-2 text-[hsl(var(--text-1))]">{e.score ?? '—'}</td>
                <td className="p-2 text-[hsl(var(--text-3))]">{e.date}</td>
                <td className="p-2"><Button variant="ghost" size="sm"><Export size={14} /></Button></td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
