import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Brain, ChartLine, Shield, Warning, Clock, CheckCircle } from '@phosphor-icons/react';
import Breadcrumbs from '../../components/Breadcrumbs';

const TABS = ['Overview', 'Performance', 'Bias & Fairness', 'Lineage', 'Compliance', 'Incidents', 'Config'] as const;

export default function ModelDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState<typeof TABS[number]>('Overview');
  return (
    <div>
      <Breadcrumbs />
      <div className="flex items-center gap-3 mb-6">
        <Link to="/models"><Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Model {id}</h1>
          <p className="text-sm text-[hsl(var(--text-3))]">Model card & governance details</p>
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-400 ml-auto">Production</Badge>
      </div>
      <div className="flex gap-1 border-b border-[hsl(var(--border))] mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${tab === t ? 'border-[hsl(var(--accent))] text-[hsl(var(--text-1))]' : 'border-transparent text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-2))]'}`}>{t}</button>
        ))}
      </div>
      {tab === 'Overview' && (
        <div className="grid grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle>Model Info</CardTitle></CardHeader><CardContent>
            <div className="space-y-2 text-sm">
              {[['Type', 'LLM'], ['Version', 'v3.2.1'], ['Framework', 'PyTorch'], ['Last Trained', '2025-01-10'], ['Owner', 'ML Ops Team'], ['Risk Level', 'High']].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-[hsl(var(--text-3))]">{k}</span><span className="text-[hsl(var(--text-1))]">{v}</span></div>
              ))}
            </div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Health Status</CardTitle></CardHeader><CardContent>
            <div className="space-y-3">
              {[{ label: 'Accuracy', value: '94.2%', status: 'green' }, { label: 'Drift', value: '0.03', status: 'green' }, { label: 'Latency', value: '120ms', status: 'amber' }, { label: 'Bias Score', value: '0.08', status: 'green' }].map(m => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--text-2))]">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[hsl(var(--text-1))]">{m.value}</span>
                    <div className={`w-2 h-2 rounded-full ${m.status === 'green' ? 'bg-emerald-400' : m.status === 'amber' ? 'bg-amber-400' : 'bg-red-400'}`} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </div>
      )}
      {tab !== 'Overview' && (
        <Card><CardContent className="p-8 text-center text-[hsl(var(--text-3))]">
          <Brain size={48} className="mx-auto mb-3 opacity-30" />
          <p>{tab} tab content for Model {id}</p>
        </CardContent></Card>
      )}
    </div>
  );
}
