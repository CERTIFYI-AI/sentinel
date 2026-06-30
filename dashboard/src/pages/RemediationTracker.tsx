import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  List, ChartBar, FunnelSimple, CalendarBlank, CheckCircle, Clock, Warning, User,
} from '@phosphor-icons/react';
import { severityColor, statusColor } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';
import { useRemediationData } from '../hooks/useRemediationData';
import PageSkeleton from '../components/ui/PageSkeleton';

interface TrackerItem {
  id: string;
  title: string;
  assignee: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  progress: number;
  startDate: string;
  dueDate: string;
  linkedRisk: string;
}

// TRACKER_ITEMS now sourced from Supabase via useRemediationData

// Timeline bounds: earliest start to latest due
const TIMELINE_START = new Date('2026-02-01');
const TIMELINE_END = new Date('2026-06-30');
const TIMELINE_DAYS = Math.ceil((TIMELINE_END.getTime() - TIMELINE_START.getTime()) / 86400000);

function dateToPercent(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  const days = Math.ceil((d.getTime() - TIMELINE_START.getTime()) / 86400000);
  const pct = (days / TIMELINE_DAYS) * 100;
  return isNaN(pct) ? 0 : Math.max(0, Math.min(100, pct));
}

function barWidth(start: string, end: string): number {
  const s = dateToPercent(start);
  const e = dateToPercent(end);
  const diff = e - s;
  return isNaN(diff) ? 1 : Math.max(1, diff);
}

function statusBarColor(status: string) {
  if (status === 'completed') return 'hsl(var(--s-ok-tx))';
  if (status === 'overdue') return 'hsl(var(--s-er-tx))';
  return 'hsl(var(--r-hi-tx))';
}

const MONTH_LABELS = ['Feb', 'Mar', 'Apr', 'May', 'Jun'];
const MONTH_DATES = ['2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01'];



export default function RemediationTracker() {
  const { orgName } = useSettingsStore();
  const { items: remediationItems, isLoading } = useRemediationData();
  // Map live data to TrackerItem shape
  const TRACKER_ITEMS: TrackerItem[] = (remediationItems || []).map((r: any) => {
    const defaultStart = r.created_at?.split('T')[0] || '2026-02-15';
    const startDate = r.start_date || r.startDate || defaultStart;
    const dueDate = r.due_date || r.dueDate || new Date().toISOString().split('T')[0];
    return {
      id: r.id || r.plan_id || '',
      title: r.title || r.name || '',
      assignee: r.assignee || r.owner || 'Unassigned',
      priority: r.priority || r.severity || 'medium',
      status: r.status || 'in_progress',
      progress: r.progress || 0,
      startDate,
      dueDate,
      linkedRisk: r.risk_id || r.linkedRisk || '',
    };
  });
  const [view, setView] = useState<'gantt' | 'list'>('gantt');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const filtered = TRACKER_ITEMS.filter(item => {
    const matchAssignee = filterAssignee === 'all' || item.assignee === filterAssignee;
    const matchPriority = filterPriority === 'all' || item.priority === filterPriority;
    return matchAssignee && matchPriority;
  });

  const ASSIGNEES = Array.from(new Set(TRACKER_ITEMS.map(i => i.assignee)));
  const todayPercent = dateToPercent(new Date().toISOString().split('T')[0]);

  if (isLoading) return <PageSkeleton />;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Remediation Timeline Tracker</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Gantt-style timeline for remediation plans
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="flex items-center gap-4 mr-4">
            {[
              { color: 'hsl(var(--s-ok-tx))', label: 'Completed' },
              { color: 'hsl(var(--r-hi-tx))', label: 'In Progress' },
              { color: 'hsl(var(--s-er-tx))', label: 'Overdue' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div style={{ width: 10, height: 10, background: l.color }} />
                <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{l.label}</span>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant={view === 'gantt' ? 'default' : 'outline'}
            onClick={() => setView('gantt')}
          >
            <ChartBar size={14} className="mr-1" /> Gantt
          </Button>
          <Button
            size="sm"
            variant={view === 'list' ? 'default' : 'outline'}
            onClick={() => setView('list')}
          >
            <List size={14} className="mr-1" /> List
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <FunnelSimple size={14} style={{ color: 'hsl(var(--text-3))' }} />
        <div className="flex items-center gap-2">
          <User size={14} style={{ color: 'hsl(var(--text-3))' }} />
          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}
          >
            <option value="all">All Assignees</option>
            {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}
        >
          <option value="all">All Priorities</option>
          {['critical', 'high', 'medium', 'low'].map(s => <option key={s}>{s}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-3))' }}>{filtered.length} plans</span>
      </div>

      {view === 'gantt' ? (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            {/* Timeline header */}
            <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
              <div style={{ width: 300, minWidth: 300, padding: '10px 12px', borderRight: '1px solid hsl(var(--border))' }}>
                <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Plan</span>
              </div>
              <div style={{ flex: 1, position: 'relative', padding: '10px 0' }}>
                {MONTH_LABELS.map((label, i) => (
                  <span
                    key={label}
                    className="text-xs font-semibold absolute"
                    style={{ left: `${dateToPercent(MONTH_DATES[i])}%`, color: 'hsl(var(--text-2))', transform: 'translateX(-50%)' }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Rows */}
            {filtered.map((item, idx) => {
              const pc = severityColor(item.priority);
              const barColor = statusBarColor(item.status);
              const left = dateToPercent(item.startDate);
              const width = barWidth(item.startDate, item.dueDate);

              return (
                <div
                  key={item.id}
                  style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))', minHeight: 52 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  {/* Label */}
                  <div style={{ width: 300, minWidth: 300, padding: '8px 12px', borderRight: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{item.id}</span>
                      <Badge style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, borderRadius: 0, fontSize: 9, padding: '0 4px' }}>
                        {item.priority}
                      </Badge>
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))', lineHeight: 1.3 }}>{item.title}</span>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.assignee}</span>
                  </div>

                  {/* Bar */}
                  <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                    {/* Grid lines */}
                    {MONTH_DATES.map((d, i) => (
                      <div key={i} style={{ position: 'absolute', left: `${dateToPercent(d)}%`, top: 0, bottom: 0, width: 1, background: 'hsl(var(--border))', opacity: 0.5 }} />
                    ))}
                    {/* Today line */}
                    <div style={{ position: 'absolute', left: `${todayPercent}%`, top: 0, bottom: 0, width: 2, background: 'hsl(var(--brand))', opacity: 0.7 }} />

                    {/* Gantt bar */}
                    <div
                      title={`${item.startDate} → ${item.dueDate} (${item.progress}%)`}
                      style={{
                        position: 'absolute',
                        left: `${left}%`,
                        width: `${width}%`,
                        height: 28,
                        background: `${barColor}25`,
                        border: `1px solid ${barColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Progress fill */}
                      <div style={{ width: `${item.progress}%`, height: '100%', background: `${barColor}60`, position: 'absolute', left: 0, top: 0 }} />
                      <span className="text-xs font-semibold relative px-1.5" style={{ color: barColor, whiteSpace: 'nowrap' }}>
                        {item.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Today label */}
            <div style={{ display: 'flex', padding: '6px 0', background: 'hsl(var(--bg-muted))' }}>
              <div style={{ width: 300, minWidth: 300, borderRight: '1px solid hsl(var(--border))' }} />
              <div style={{ flex: 1, position: 'relative', paddingLeft: 8 }}>
                <span
                  className="text-xs font-semibold absolute"
                  style={{ left: `${todayPercent}%`, color: 'hsl(var(--brand))', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
                >
                  ▲ Today
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['ID', 'Title', 'Assignee', 'Priority', 'Progress', 'Start', 'Due', 'Status'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const pc = severityColor(item.priority);
                  const sc = statusColor(item.status);
                  const barColor = statusBarColor(item.status);
                  return (
                    <tr key={item.id} style={{ borderTop: '1px solid hsl(var(--border))' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{item.id}</td>
                      <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))', maxWidth: 240 }}>
                        <span className="block truncate">{item.title}</span>
                      </td>
                      <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{item.assignee}</td>
                      <td className="p-3">
                        <Badge style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, borderRadius: 0, fontSize: 11 }}>{item.priority}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div style={{ width: 60, height: 6, background: 'hsl(var(--bg-muted))' }}>
                            <div style={{ width: `${item.progress}%`, height: '100%', background: barColor }} />
                          </div>
                          <span className="text-xs" style={{ color: barColor }}>{item.progress}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{item.startDate}</td>
                      <td className="p-3 text-xs" style={{ color: item.status === 'overdue' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-3))' }}>{item.dueDate}</td>
                      <td className="p-3">
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 11 }}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Plans', value: TRACKER_ITEMS.length, icon: CalendarBlank, color: 'hsl(var(--brand))' },
          { label: 'In Progress', value: TRACKER_ITEMS.filter(i => i.status === 'in_progress').length, icon: Clock, color: 'hsl(var(--r-hi-tx))' },
          { label: 'Overdue', value: TRACKER_ITEMS.filter(i => i.status === 'overdue').length, icon: Warning, color: 'hsl(var(--s-er-tx))' },
          { label: 'Completed', value: TRACKER_ITEMS.filter(i => i.status === 'completed').length, icon: CheckCircle, color: 'hsl(var(--s-ok-tx))' },
        ].map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              </div>
              <s.icon size={28} style={{ color: s.color }} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
