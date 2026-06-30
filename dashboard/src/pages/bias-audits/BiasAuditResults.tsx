import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  ArrowLeft, Warning, CheckCircle, XCircle, ClipboardText, Clock,
  User, Brain, Shield, Plus,
} from '@phosphor-icons/react';
import { BIAS_AUDITS, severityColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useEffect } from 'react'
import { useBiasAudits } from '../../hooks/queries/useBiasAudits'


function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const color = score >= 0.85 ? 'hsl(var(--s-ok-tx))' : score >= 0.70 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-er-tx))';
  const pct = score * 100;
  const radius = (size / 2) - 10;
  const circumference = Math.PI * radius;
  const progress = (score / 1) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size / 2 + 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        <path
          d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none" stroke="hsl(var(--bg-muted))" strokeWidth="10" strokeLinecap="butt"
        />
        <path
          d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="butt"
          strokeDasharray={`${progress} ${circumference}`}
        />
      </svg>
      <div style={{ position: 'absolute', bottom: 0, textAlign: 'center' }}>
        <p className="text-3xl font-bold" style={{ color }}>{pct.toFixed(0)}%</p>
        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>fairness score</p>
      </div>
    </div>
  );
}

// MOCK_TIMELINE kept for reference - Supabase bias_audits loaded below
const MOCK_TIMELINE = [
  { date: '2026-01-15', action: 'Audit scheduled', actor: 'System' },
  { date: '2026-01-18', action: 'Dataset prepared and validated', actor: 'David Kim' },
  { date: '2026-01-20', action: 'Audit commenced', actor: 'Maria Santos' },
  { date: '2026-01-22', action: 'Preliminary results reviewed', actor: 'Raj Gupta' },
  { date: '2026-01-22', action: 'Audit completed — results published', actor: 'Maria Santos' },
];

export default function BiasAuditResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgName } = useSettingsStore();

  const audit = BIAS_AUDITS.find(a => a.id === id);

  if (!audit) {
    return (
      <div className="p-6 flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
        <Warning size={48} style={{ color: 'hsl(var(--r-hi-tx))' }} />
        <p className="mt-4 text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Bias audit not found</p>
        <Button className="mt-4" onClick={() => navigate('/bias-audits')} style={{ borderRadius: 0 }}>
          <ArrowLeft size={14} className="mr-1" /> Back to Bias Audits
        </Button>
      </div>
    );
  }

  const resultColor = audit.result === 'passed' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))';
  const sc = severityColor(audit.severity);
  const passCount = audit.dimensions.filter(d => d.pass).length;
  const failCount = audit.dimensions.filter(d => !d.pass).length;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/bias-audits')} style={{ padding: '4px 8px' }}>
        <ArrowLeft size={14} className="mr-1" /> Back to Bias Audits
      </Button>

      {/* Failed Banner */}
      {audit.result === 'failed' && (
        <div style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-tx))', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <XCircle size={20} style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0 }} />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: 'hsl(var(--s-er-tx))' }}>Bias Audit FAILED — Remediation Required</p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--s-er-tx))', opacity: 0.85 }}>
              {failCount} dimension{failCount > 1 ? 's' : ''} below threshold. This model must not be used for high-stakes decisions until remediated.
            </p>
          </div>
          <Button size="sm" style={{ background: 'hsl(var(--s-er-tx))', color: 'white', borderRadius: 0, flexShrink: 0 }}>
            <Plus size={14} className="mr-1" /> Create Remediation Task
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{audit.modelName}</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Audit {audit.id} · Framework: {audit.framework}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 12 }}>
            {audit.severity} severity
          </Badge>
          <Badge style={{
            background: `${resultColor}20`,
            color: resultColor,
            border: `1px solid ${resultColor}`,
            borderRadius: 0,
            fontSize: 13,
            fontWeight: 700,
            padding: '4px 12px',
          }}>
            {audit.result === 'passed' ? <CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} /> : <XCircle size={12} style={{ display: 'inline', marginRight: 4 }} />}
            {audit.result.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Meta Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Model ID', value: audit.modelId, icon: Brain },
          { label: 'Dataset', value: audit.dataset, icon: ClipboardText },
          { label: 'Auditor', value: audit.auditor, icon: User },
          { label: 'Audit Date', value: formatDate(audit.date), icon: Clock },
        ].map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <p className="text-sm font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              </div>
              <s.icon size={22} style={{ color: 'hsl(var(--brand))' }} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Score Gauge */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Overall Fairness Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-4">
            <ScoreGauge score={audit.overallScore} size={160} />
            <div className="mt-3 flex gap-3 text-center">
              <div>
                <p className="text-2xl font-bold" style={{ color: 'hsl(var(--s-ok-tx))' }}>{passCount}</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Passed</p>
              </div>
              <div style={{ width: 1, background: 'hsl(var(--border))' }} />
              <div>
                <p className="text-2xl font-bold" style={{ color: 'hsl(var(--s-er-tx))' }}>{failCount}</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dimension Breakdown */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', gridColumn: '2 / 4' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Dimension Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['Protected Attribute', 'Score', 'Threshold', 'Status', 'Gap'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audit.dimensions.map(d => {
                  const color = d.pass ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))';
                  const gap = (d.score - d.threshold) * 100;
                  return (
                    <tr key={d.attribute} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                      <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{d.attribute}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div style={{ width: 70, height: 6, background: 'hsl(var(--bg-muted))' }}>
                            <div style={{ width: `${d.score * 100}%`, height: '100%', background: color }} />
                          </div>
                          <span className="text-sm font-semibold" style={{ color }}>{(d.score * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-3))' }}>{(d.threshold * 100).toFixed(0)}%</td>
                      <td className="p-3">
                        <Badge style={{
                          background: `${color}20`,
                          color,
                          border: `1px solid ${color}`,
                          borderRadius: 0,
                          fontSize: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          width: 'fit-content',
                        }}>
                          {d.pass ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {d.pass ? 'PASS' : 'FAIL'}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs font-semibold" style={{ color: gap < 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' }}>
                        {gap >= 0 ? '+' : ''}{gap.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Protected Attributes */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Protected Attributes Tested</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {audit.protectedAttributes.map(attr => (
              <Badge key={attr.name} variant="outline" style={{ borderRadius: 0, fontSize: 12 }}>
                <Shield size={11} className="mr-1" /> {attr.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {audit.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(var(--brand))', minWidth: 20, marginTop: 2 }}>{i + 1}.</span>
                <span className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Audit Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {MOCK_TIMELINE.map((event, i) => (
              <div key={i} className="flex gap-4" style={{ paddingBottom: i < MOCK_TIMELINE.length - 1 ? 16 : 0, position: 'relative' }}>
                {/* Line */}
                {i < MOCK_TIMELINE.length - 1 && (
                  <div style={{ position: 'absolute', left: 7, top: 16, bottom: 0, width: 2, background: 'hsl(var(--border))' }} />
                )}
                {/* Dot */}
                <div style={{ width: 16, height: 16, background: i === MOCK_TIMELINE.length - 1 ? 'hsl(var(--brand))' : 'hsl(var(--bg-muted))', border: '2px solid hsl(var(--brand))', borderRadius: '50%', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{event.action}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(event.date)} · {event.actor}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
