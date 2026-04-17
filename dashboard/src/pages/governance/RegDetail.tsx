import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  ArrowLeft, Warning, CheckCircle, Clock, CalendarBlank,
  Globe, Shield, ListChecks, Lightning,
} from '@phosphor-icons/react';
import { REGULATIONS, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

import { useRegulations } from '../../hooks/queries/useRegulations'

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback
const MOCK_TIMELINES: Record<string, Array<{ date: string; event: string; actor: string }>> = {
  'REG-001': [
    { date: '2026-01-10', event: 'EU AI Act impact assessment initiated', actor: 'James Patel' },
    { date: '2026-02-01', event: 'High-risk AI systems identified and documented', actor: 'Emma Wilson' },
    { date: '2026-03-01', event: 'Gap analysis completed — 12 gaps identified', actor: 'Raj Gupta' },
    { date: '2026-03-15', event: 'Remediation plans created for critical gaps', actor: 'James Patel' },
  ],
  'REG-002': [
    { date: '2025-11-01', event: 'Colorado SB 205 effective date monitoring started', actor: 'System' },
    { date: '2026-01-15', event: 'Algorithmic impact assessment submitted', actor: 'James Patel' },
    { date: '2026-02-01', event: 'Regulation became effective', actor: 'System' },
    { date: '2026-02-15', event: 'Compliance review completed', actor: 'Emma Wilson' },
  ],
  'REG-003': [
    { date: '2026-01-15', event: 'Singapore AI Verify assessment started', actor: 'Raj Gupta' },
    { date: '2026-02-15', event: 'Self-assessment completed', actor: 'Maria Santos' },
    { date: '2026-03-01', event: 'Framework became effective', actor: 'System' },
    { date: '2026-03-10', event: 'Governance report submitted to IMDA', actor: 'James Patel' },
  ],
  'REG-004': [
    { date: '2026-01-01', event: 'ISO/IEC 42001 certification project initiated', actor: 'James Patel' },
    { date: '2026-02-01', event: 'Gap analysis against ISO 42001 requirements', actor: 'Emma Wilson' },
    { date: '2026-03-15', event: 'Remediation roadmap finalized', actor: 'James Patel' },
    { date: '2026-04-01', event: 'Pre-audit assessment scheduled', actor: 'Emma Wilson' },
  ],
  'REG-005': [
    { date: '2026-02-01', event: 'NIST AI RMF 2.0 update announced', actor: 'System' },
    { date: '2026-02-15', event: 'Review of updated framework initiated', actor: 'Raj Gupta' },
    { date: '2026-03-20', event: 'Gap analysis against existing controls', actor: 'Maria Santos' },
  ],
};

export default function RegDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgName } = useSettingsStore();

  const regulation = REGULATIONS.find(r => r.id === id);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());

  function toggleItem(idx: number) {
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  if (!regulation) {
    return (
      <div className="p-6 flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
        <Warning size={48} style={{ color: '#f97316' }} />
        <p className="mt-4 text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Regulation not found</p>
        <Button className="mt-4" onClick={() => navigate('/reg-radar')} style={{ borderRadius: 0 }}>
          <ArrowLeft size={14} className="mr-1" /> Back to Reg Radar
        </Button>
      </div>
    );
  }

  const rc = severityColor(regulation.impact);
  const sc = statusColor(regulation.status);
  const days = regulation.daysUntilEffective;
  const isOverdue = days < 0;
  const isUrgent = days >= 0 && days <= 30;

  const completedCount = completedItems.size;
  const totalItems = regulation.actionItems.length;
  const checklistProgress = Math.round((completedCount / totalItems) * 100);

  const timeline = MOCK_TIMELINES[regulation.id] || [];

  function daysDisplay() {
    if (isOverdue) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Effective today';
    return `${days} days remaining`;
  }

  function countdownColor() {
    if (isOverdue) return '#ef4444';
    if (isUrgent) return '#f97316';
    return '#10b981';
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      <Button variant="ghost" size="sm" onClick={() => navigate('/reg-radar')} style={{ padding: '4px 8px' }}>
        <ArrowLeft size={14} className="mr-1" /> Back to Reg Radar
      </Button>

      {/* Overdue Alert */}
      {isOverdue && (
        <div style={{ background: '#ef444415', border: '1px solid #ef4444', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Warning size={18} style={{ color: '#ef4444' }} />
          <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
            This regulation became effective {Math.abs(days)} days ago. Ensure compliance measures are fully implemented.
          </p>
        </div>
      )}

      {isUrgent && !isOverdue && (
        <div style={{ background: '#f9731615', border: '1px solid #f97316', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={18} style={{ color: '#f97316' }} />
          <p className="text-sm font-semibold" style={{ color: '#f97316' }}>
            Effective in {days} days — escalate preparation immediately.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{regulation.name}</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Jurisdiction: {regulation.jurisdiction} · ID: {regulation.id}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`, borderRadius: 0 }}>
            {regulation.impact} impact
          </Badge>
          <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
            {regulation.status}
          </Badge>
        </div>
      </div>

      {/* Countdown + Meta Row */}
      <div className="grid grid-cols-4 gap-4">
        {/* Countdown */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: `2px solid ${countdownColor()}` }}>
          <CardContent className="p-4 flex flex-col items-center text-center">
            <CalendarBlank size={24} style={{ color: countdownColor(), marginBottom: 8 }} />
            <p className="text-3xl font-bold" style={{ color: countdownColor() }}>
              {isOverdue ? Math.abs(days) : days}
            </p>
            <p className="text-xs mt-1" style={{ color: countdownColor() }}>
              {isOverdue ? 'days overdue' : 'days remaining'}
            </p>
            <p className="text-xs mt-2" style={{ color: 'hsl(var(--text-3))' }}>
              Effective: {formatDate(regulation.effectiveDate)}
            </p>
          </CardContent>
        </Card>

        {/* Jurisdiction */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-4 flex items-center gap-3">
            <Globe size={24} style={{ color: 'hsl(var(--brand))' }} />
            <div>
              <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Jurisdiction</p>
              <p className="text-xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{regulation.jurisdiction}</p>
            </div>
          </CardContent>
        </Card>

        {/* Action Items Progress */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-4">
            <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-3))' }}>Action Items Progress</p>
            <p className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{completedCount}/{totalItems}</p>
            <div style={{ marginTop: 8, height: 6, background: 'hsl(var(--bg-muted))' }}>
              <div style={{ width: `${checklistProgress}%`, height: '100%', background: '#10b981' }} />
            </div>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>{checklistProgress}% complete</p>
          </CardContent>
        </Card>

        {/* Impact */}
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-4 flex items-center gap-3">
            <Lightning size={24} style={{ color: rc.text }} />
            <div>
              <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Business Impact</p>
              <p className="text-xl font-bold" style={{ color: rc.text }}>{regulation.impact.toUpperCase()}</p>
              <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>impact level</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Regulation Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>{regulation.description}</p>
        </CardContent>
      </Card>

      {/* Action Items Checklist */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              <ListChecks size={15} style={{ display: 'inline', marginRight: 6 }} />
              Action Items Checklist
            </CardTitle>
            <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{completedCount} of {totalItems} completed</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {regulation.actionItems.map((item, idx) => {
            const done = completedItems.has(idx);
            return (
              <label
                key={idx}
                className="flex items-start gap-3 cursor-pointer"
                style={{
                  padding: '10px 12px',
                  background: done ? '#10b98108' : 'transparent',
                  border: `1px solid ${done ? '#10b981' : 'hsl(var(--border))'}`,
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggleItem(idx)}
                  style={{ accentColor: '#10b981', marginTop: 2, flexShrink: 0 }}
                />
                <div className="flex-1">
                  <p className="text-sm" style={{ color: done ? 'hsl(var(--text-3))' : 'hsl(var(--text-1))', textDecoration: done ? 'line-through' : 'none' }}>
                    {item}
                  </p>
                </div>
                {done && <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} />}
              </label>
            );
          })}

          {completedCount === totalItems && (
            <div style={{ marginTop: 12, padding: '12px 16px', background: '#10b98115', border: '1px solid #10b981', display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={18} style={{ color: '#10b981' }} />
              <p className="text-sm font-semibold" style={{ color: '#10b981' }}>All action items completed — regulation compliance achieved!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      {timeline.length > 0 && (
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Compliance Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {timeline.map((event, i) => (
                <div key={i} className="flex gap-4" style={{ paddingBottom: i < timeline.length - 1 ? 16 : 0, position: 'relative' }}>
                  {i < timeline.length - 1 && (
                    <div style={{ position: 'absolute', left: 7, top: 16, bottom: 0, width: 2, background: 'hsl(var(--border))' }} />
                  )}
                  <div style={{ width: 16, height: 16, background: i === timeline.length - 1 ? 'hsl(var(--brand))' : 'hsl(var(--bg-muted))', border: '2px solid hsl(var(--brand))', borderRadius: '50%', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{event.event}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(event.date)} · {event.actor}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
