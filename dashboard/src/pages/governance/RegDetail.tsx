import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  ArrowLeft, Globe, Clock, Warning, CheckSquare, CheckCircle,
  Flag, CalendarCheck, Info,
} from '@phosphor-icons/react';
import { REGULATIONS, Severity, severityColor, formatDate } from '../../data/seed';

function getDaysLabel(days: number): { label: string; color: string } {
  if (days < 0) return { label: `${Math.abs(days)} days overdue`, color: '#ef4444' };
  if (days === 0) return { label: 'Effective today', color: '#ef4444' };
  if (days <= 30) return { label: `${days} days remaining`, color: '#f97316' };
  return { label: `${days} days remaining`, color: '#10b981' };
}

// Impact assessment data
function getImpactAssessment(impact: Severity) {
  const map = {
    critical: { level: 'Critical', score: 95, description: 'Immediate action required. Non-compliance may result in significant regulatory penalties or operational suspension.', areas: ['AI System Architecture', 'Data Governance', 'Risk Management', 'Legal & Compliance'] },
    high: { level: 'High', score: 75, description: 'Significant business impact. Must be addressed within the compliance timeline with dedicated resources.', areas: ['Risk Management', 'Legal & Compliance', 'Operations'] },
    medium: { level: 'Medium', score: 50, description: 'Moderate impact. Incorporate into existing compliance programs and monitor progress.', areas: ['Legal & Compliance', 'Operations'] },
    low: { level: 'Low', score: 25, description: 'Limited operational impact. Can be addressed through standard compliance processes.', areas: ['Legal & Compliance'] },
  };
  return map[impact] || map['medium'];
}

const IMPACT_BAR_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981',
};

export default function RegDetail() {
  const { id } = useParams<{ id: string }>();
  const regulation = REGULATIONS.find(r => r.id === id);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  function toggleCheck(i: number) {
    setCheckedItems(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  if (!regulation) {
    return (
      <div className="p-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <Link to="/reg-radar">
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
            <ArrowLeft size={14} className="mr-1" /> Back to Regulatory Radar
          </Button>
        </Link>
        <div className="flex flex-col items-center justify-center py-24">
          <Warning size={48} style={{ color: 'hsl(var(--text-3))' }} />
          <p className="mt-4 text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Regulation Not Found</p>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>No regulation with ID: {id}</p>
        </div>
      </div>
    );
  }

  const sc = severityColor(regulation.impact);
  const dayInfo = getDaysLabel(regulation.daysUntilEffective);
  const impact = getImpactAssessment(regulation.impact);
  const isOverdue = regulation.daysUntilEffective < 0;

  // Progress: effective date vs 6 months prep window
  const totalPrepDays = 180;
  const daysElapsed = totalPrepDays - Math.max(0, regulation.daysUntilEffective);
  const timelineProgress = Math.min(100, Math.round((daysElapsed / totalPrepDays) * 100));
  const completedActions = checkedItems.size;
  const totalActions = regulation.actionItems.length;
  const actionProgress = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Back button */}
      <Link to="/reg-radar">
        <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
          <ArrowLeft size={14} className="mr-1" /> Back to Regulatory Radar
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{regulation.id}</span>
            <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
              {regulation.impact} impact
            </Badge>
            <Badge variant="outline" style={{ borderRadius: 0, color: dayInfo.color, borderColor: dayInfo.color }}>
              {dayInfo.label}
            </Badge>
            {isOverdue && (
              <Badge style={{ background: 'hsl(var(--s-er-bg))', color: '#ef4444', border: '1px solid #ef444444', borderRadius: 0 }}>
                ⚠ Overdue
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{regulation.name}</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>{regulation.description}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Jurisdiction', value: regulation.jurisdiction, icon: Globe, color: '#3b82f6' },
          { label: 'Effective Date', value: formatDate(regulation.effectiveDate), icon: CalendarCheck, color: '#6366f1' },
          { label: 'Impact Level', value: regulation.impact, icon: Warning, color: IMPACT_BAR_COLOR[regulation.impact] },
          { label: 'Action Items', value: `${completedActions}/${totalActions} complete`, icon: CheckSquare, color: '#10b981' },
        ].map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <p className="text-base font-bold" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
          <TabsTrigger value="actions" style={{ borderRadius: 0 }}>Action Items</TabsTrigger>
          <TabsTrigger value="timeline" style={{ borderRadius: 0 }}>Timeline</TabsTrigger>
          <TabsTrigger value="impact" style={{ borderRadius: 0 }}>Impact Assessment</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Regulation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Regulation ID', value: regulation.id },
                  { label: 'Name', value: regulation.name },
                  { label: 'Jurisdiction', value: regulation.jurisdiction },
                  { label: 'Impact', value: regulation.impact },
                  { label: 'Status', value: regulation.status },
                  { label: 'Effective Date', value: formatDate(regulation.effectiveDate) },
                  { label: 'Days Until Effective', value: getDaysLabel(regulation.daysUntilEffective).label },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                    <span className="text-sm font-medium" style={{ color: r.label === 'Days Until Effective' ? dayInfo.color : 'hsl(var(--text-1))' }}>
                      {r.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{regulation.description}</p>
                <div className="mt-6">
                  <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-2))' }}>Action Items Progress</p>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'hsl(var(--text-3))' }}>{completedActions} of {totalActions} completed</span>
                    <span style={{ color: '#10b981' }}>{actionProgress}%</span>
                  </div>
                  <div style={{ background: 'hsl(var(--bg-muted))', height: 8 }}>
                    <div style={{ width: actionProgress + '%', height: '100%', background: '#10b981' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Action Items */}
        <TabsContent value="actions" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  Required Action Items
                </CardTitle>
                <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                  {completedActions}/{totalActions} completed ({actionProgress}%)
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'hsl(var(--text-3))' }}>Overall progress</span>
                  <span style={{ color: '#10b981' }}>{actionProgress}%</span>
                </div>
                <div style={{ background: 'hsl(var(--bg-muted))', height: 6 }}>
                  <div style={{ width: actionProgress + '%', height: '100%', background: '#10b981' }} />
                </div>
              </div>
              <ul className="space-y-2">
                {regulation.actionItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 p-3 cursor-pointer"
                    style={{
                      border: '1px solid hsl(var(--border))',
                      background: checkedItems.has(i) ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--bg-muted))',
                    }}
                    onClick={() => toggleCheck(i)}
                  >
                    {checkedItems.has(i) ? (
                      <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <CheckSquare size={16} style={{ color: 'hsl(var(--text-3))', flexShrink: 0, marginTop: 1 }} />
                    )}
                    <span className="text-sm" style={{ color: checkedItems.has(i) ? 'hsl(var(--text-3))' : 'hsl(var(--text-1))', textDecoration: checkedItems.has(i) ? 'line-through' : 'none' }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                Timeline to Effective Date: {formatDate(regulation.effectiveDate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs mb-2">
                  <span style={{ color: 'hsl(var(--text-3))' }}>Preparation window</span>
                  <span style={{ color: dayInfo.color }}>{dayInfo.label}</span>
                </div>
                <div className="relative" style={{ background: 'hsl(var(--bg-muted))', height: 12 }}>
                  <div style={{ width: timelineProgress + '%', height: '100%', background: isOverdue ? '#ef4444' : 'hsl(var(--brand))', transition: 'width 0.3s' }} />
                  {/* Today marker */}
                  <div
                    className="absolute top-0 w-0.5 h-full"
                    style={{ left: timelineProgress + '%', background: '#ef4444' }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                  <span>Start</span>
                  <span style={{ color: '#ef4444' }}>Today</span>
                  <span>Effective Date</span>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-3">
                {[
                  { milestone: 'Regulation announced', done: true },
                  { milestone: 'Gap analysis initiated', done: true },
                  { milestone: 'Action plan approved', done: regulation.status !== 'monitoring' },
                  { milestone: 'Controls implemented', done: regulation.status === 'effective' },
                  { milestone: 'Compliance verified', done: regulation.status === 'effective' },
                  { milestone: 'Effective date', done: regulation.daysUntilEffective <= 0 },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {m.done ? (
                      <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'hsl(var(--text-4))' }} />
                    )}
                    <span className="text-sm" style={{ color: m.done ? 'hsl(var(--text-2))' : 'hsl(var(--text-3))' }}>{m.milestone}</span>
                    {m.milestone === 'Effective date' && (
                      <Badge variant="outline" style={{ borderRadius: 0, marginLeft: 'auto', fontSize: 10, color: dayInfo.color, borderColor: dayInfo.color }}>
                        {formatDate(regulation.effectiveDate)}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impact Assessment */}
        <TabsContent value="impact" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Impact Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Impact level */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'hsl(var(--text-2))' }}>Impact Score</span>
                  <span className="font-bold" style={{ color: IMPACT_BAR_COLOR[regulation.impact] }}>{impact.score}/100</span>
                </div>
                <div style={{ background: 'hsl(var(--bg-muted))', height: 10 }}>
                  <div style={{ width: impact.score + '%', height: '100%', background: IMPACT_BAR_COLOR[regulation.impact] }} />
                </div>
              </div>
              <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{impact.description}</p>
              {/* Affected areas */}
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-2))' }}>Affected Business Areas</p>
                <div className="flex flex-wrap gap-2">
                  {impact.areas.map(area => (
                    <Badge key={area} variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{area}</Badge>
                  ))}
                </div>
              </div>
              {/* Risk breakdown */}
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-2))' }}>Risk Dimensions</p>
                {[
                  { label: 'Legal / Regulatory Risk', score: impact.score },
                  { label: 'Operational Risk', score: Math.round(impact.score * 0.8) },
                  { label: 'Reputational Risk', score: Math.round(impact.score * 0.7) },
                  { label: 'Financial Risk', score: Math.round(impact.score * 0.6) },
                ].map(d => (
                  <div key={d.label} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'hsl(var(--text-2))' }}>{d.label}</span>
                      <span style={{ color: IMPACT_BAR_COLOR[regulation.impact] }}>{d.score}</span>
                    </div>
                    <div style={{ background: 'hsl(var(--bg-muted))', height: 6 }}>
                      <div style={{ width: d.score + '%', height: '100%', background: IMPACT_BAR_COLOR[regulation.impact] }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
