import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ArrowLeft, FileText, Clock, Users, CheckCircle } from '@phosphor-icons/react';
import Breadcrumbs from '../../components/Breadcrumbs';

const TABS = ['Details', 'Versions', 'Approvals', 'Controls', 'Evidence', 'Audit Trail'] as const;

export default function PolicyDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState<typeof TABS[number]>('Details');
  return (
    <div>
      <Breadcrumbs />
      <div className="flex items-center gap-3 mb-6">
        <Link to="/policies"><Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Policy {id}</h1>
          <p className="text-sm text-[hsl(var(--text-3))]">Policy lifecycle & compliance mapping</p>
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-400 ml-auto">Active</Badge>
      </div>
      <div className="flex gap-1 border-b border-[hsl(var(--border))] mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${tab === t ? 'border-[hsl(var(--accent))] text-[hsl(var(--text-1))]' : 'border-transparent text-[hsl(var(--text-3))]'}`}>{t}</button>
        ))}
      </div>
      {tab === 'Details' && (
        <div className="grid grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle>Policy Info</CardTitle></CardHeader><CardContent>
            <div className="space-y-2 text-sm">
              {[['Category', 'AI Governance'], ['Framework', 'ISO 42001'], ['Owner', 'CISO Office'], ['Last Reviewed', '2025-01-10'], ['Next Review', '2025-07-10'], ['Version', 'v2.1']].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-[hsl(var(--text-3))]">{k}</span><span className="text-[hsl(var(--text-1))]">{v}</span></div>
              ))}
            </div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Approval Status</CardTitle></CardHeader><CardContent>
            <div className="space-y-3">
              {[{ role: 'Legal Review', status: 'Approved', date: '2025-01-08' }, { role: 'CISO Approval', status: 'Approved', date: '2025-01-09' }, { role: 'Board Sign-off', status: 'Pending', date: null }].map(a => (
                <div key={a.role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {a.status === 'Approved' ? <CheckCircle size={16} className="text-emerald-400" /> : <Clock size={16} className="text-amber-400" />}
                    <span className="text-sm text-[hsl(var(--text-1))]">{a.role}</span>
                  </div>
                  <Badge className={a.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}>{a.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </div>
      )}
      {tab !== 'Details' && (
        <Card><CardContent className="p-8 text-center text-[hsl(var(--text-3))]">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p>{tab} tab content for Policy {id}</p>
        </CardContent></Card>
      )}
    </div>
  );
}
