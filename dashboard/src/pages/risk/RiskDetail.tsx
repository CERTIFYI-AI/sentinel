import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Warning, TrendUp, TrendDown, Shield } from '@phosphor-icons/react';
import Breadcrumbs from '../../components/Breadcrumbs';

export default function RiskDetail() {
  const { id } = useParams();
  return (
    <div>
      <Breadcrumbs />
      <div className="flex items-center gap-3 mb-6">
        <Link to="/risk"><Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Risk {id}</h1>
          <p className="text-sm text-[hsl(var(--text-3))]">Risk detail & mitigation tracking</p>
        </div>
        <Badge className="bg-red-500/20 text-red-400 ml-auto">High</Badge>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <p className="text-xs text-[hsl(var(--text-3))]">Likelihood</p>
          <p className="text-2xl font-bold text-[hsl(var(--text-1))]">4/5</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-[hsl(var(--text-3))]">Impact</p>
          <p className="text-2xl font-bold text-[hsl(var(--text-1))]">5/5</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-[hsl(var(--text-3))]">Risk Score</p>
          <p className="text-2xl font-bold text-red-400">20</p>
        </CardContent></Card>
      </div>
      <Card className="mb-4">
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent><p className="text-[hsl(var(--text-2))]">Uncontrolled model drift in production credit scoring model may lead to discriminatory lending decisions and regulatory non-compliance with fair lending laws.</p></CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader><CardTitle>Mitigation Plan</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {['Implement automated drift monitoring', 'Weekly bias audits', 'Establish rollback procedures', 'Quarterly model retraining'].map((m, i) => (
              <div key={i} className="flex items-center gap-2 p-2 border border-[hsl(var(--border))]">
                <Shield size={16} className="text-[hsl(var(--accent))]" />
                <span className="text-sm text-[hsl(var(--text-1))]">{m}</span>
                <Badge className="ml-auto" variant="outline">{i < 2 ? 'Done' : 'Pending'}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
