import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  CalendarBlank,
  MagnifyingGlass,
  Export,
  List,
  GridFour,
  Warning,
  Clock,
  CaretLeft,
  CaretRight,
  X,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import { useSettingsStore } from '../../stores/settingsStore';


// ── Types ────────────────────────────────────────────────────────────────

type EventType = 'audit' | 'review' | 'deadline' | 'certification';
type EventStatus = 'Overdue' | 'Upcoming' | 'Completed';

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: EventType;
  framework: string;
  status: EventStatus;
  owner: string;
}

// ── Color config ─────────────────────────────────────────────────────────

const typeColors: Record<EventType, string> = {
  audit: '#3b82f6',
  review: '#10b981',
  deadline: '#ef4444',
  certification: '#8b5cf6',
};

const typeLabels: Record<EventType, string> = {
  audit: 'Audit',
  review: 'Review',
  deadline: 'Deadline',
  certification: 'Certification',
};

// ── Seed data ────────────────────────────────────────────────────────────

const EVENTS: CalendarEvent[] = [
  {
    id: 'EVT-001',
    date: '2026-04-01',
    title: 'SOC 2 Type II evidence collection deadline',
    type: 'deadline',
    framework: 'SOC 2',
    status: 'Overdue',
    owner: 'Sarah Chen',
  },
  {
    id: 'EVT-002',
    date: '2026-04-05',
    title: 'ISO 27001 quarterly access review',
    type: 'review',
    framework: 'ISO 27001',
    status: 'Overdue',
    owner: 'David Kim',
  },
  {
    id: 'EVT-003',
    date: '2026-04-10',
    title: 'EU AI Act conformity assessment checkpoint',
    type: 'audit',
    framework: 'EU AI Act',
    status: 'Upcoming',
    owner: 'BSI Group',
  },
  {
    id: 'EVT-004',
    date: '2026-04-15',
    title: 'GDPR DPIA annual refresh',
    type: 'review',
    framework: 'GDPR',
    status: 'Upcoming',
    owner: 'DPO Office',
  },
  {
    id: 'EVT-005',
    date: '2026-04-20',
    title: 'Vendor risk reassessment \u2014 OpenAI',
    type: 'review',
    framework: 'SOC 2',
    status: 'Upcoming',
    owner: 'Michael Torres',
  },
  {
    id: 'EVT-006',
    date: '2026-04-25',
    title: 'AI Ethics Board quarterly meeting',
    type: 'review',
    framework: 'Internal',
    status: 'Upcoming',
    owner: 'Ethics Committee',
  },
  {
    id: 'EVT-007',
    date: '2026-04-30',
    title: 'ISO 27001 audit fieldwork completion',
    type: 'audit',
    framework: 'ISO 27001',
    status: 'Upcoming',
    owner: 'Deloitte LLP',
  },
  {
    id: 'EVT-008',
    date: '2026-05-01',
    title: 'SOC 2 Type II audit start',
    type: 'audit',
    framework: 'SOC 2',
    status: 'Upcoming',
    owner: 'PwC',
  },
  {
    id: 'EVT-009',
    date: '2026-05-15',
    title: 'NIST AI RMF gap analysis report due',
    type: 'deadline',
    framework: 'NIST AI RMF',
    status: 'Upcoming',
    owner: 'Internal Audit',
  },
  {
    id: 'EVT-010',
    date: '2026-05-28',
    title: 'Data center DR test',
    type: 'review',
    framework: 'ISO 27001',
    status: 'Upcoming',
    owner: 'David Kim',
  },
  {
    id: 'EVT-011',
    date: '2026-06-01',
    title: 'GDPR consent mechanism review',
    type: 'review',
    framework: 'GDPR',
    status: 'Upcoming',
    owner: 'Legal Team',
  },
  {
    id: 'EVT-012',
    date: '2026-06-15',
    title: 'AI Acceptable Use Policy review',
    type: 'review',
    framework: 'ISO 27001',
    status: 'Upcoming',
    owner: 'Sarah Chen',
  },
  {
    id: 'EVT-013',
    date: '2026-06-30',
    title: 'EU AI Act compliance deadline (high-risk systems)',
    type: 'deadline',
    framework: 'EU AI Act',
    status: 'Upcoming',
    owner: 'Compliance Team',
  },
  {
    id: 'EVT-014',
    date: '2026-07-01',
    title: 'SOC 2 certification renewal',
    type: 'certification',
    framework: 'SOC 2',
    status: 'Upcoming',
    owner: 'PwC',
  },
  {
    id: 'EVT-015',
    date: '2026-07-15',
    title: 'ISO 27001 recertification',
    type: 'certification',
    framework: 'ISO 27001',
    status: 'Upcoming',
    owner: 'Deloitte LLP',
  },
];


// ── Inline MetricTile ────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{label}</span>
          <Icon size={16} style={{ color }} />
        </div>
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      </CardContent>
    </Card>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function exportCSV(events: CalendarEvent[]) {
  const headers = ['Date', 'Event', 'Type', 'Framework', 'Status', 'Owner'];
  const rows = events.map(e => [
    e.date,
    `"${e.title.replace(/"/g, '""')}"`,
    typeLabels[e.type],
    e.framework,
    e.status,
    e.owner,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'compliance-calendar.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('Calendar exported as CSV');
}

// ── Main Component ───────────────────────────────────────────────────────

export default function ComplianceCalendar() {
  const { orgName } = useSettingsStore();
  const [events, setEvents] = useState<CalendarEvent[]>(EVENTS);
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(3); // April = 3 (0-indexed)
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', date: '', type: 'audit' as EventType, framework: '', owner: '', status: 'Upcoming' as EventStatus });
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

  // ── Derived data ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return events.filter(e => {
      const matchSearch =
        !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.framework.toLowerCase().includes(search.toLowerCase()) ||
        e.owner.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || e.type === filterType;
      const matchStatus = filterStatus === 'all' || e.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [events, search, filterType, filterStatus]);

  const thisMonthEvents = events.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d.getMonth() === 3 && d.getFullYear() === 2026;
  });

  const overdueCount = events.filter(e => e.status === 'Overdue').length;

  const coming30 = events.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    const now = new Date('2026-04-08T00:00:00');
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  });

  const coming90 = events.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    const now = new Date('2026-04-08T00:00:00');
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 90;
  });

  // ── Calendar grid data ───────────────────────────────────────────────

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfWeek(calYear, calMonth);

  const eventsForMonth = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    events.forEach(e => {
      const d = new Date(e.date + 'T00:00:00');
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(e);
      }
    });
    return map;
  }, [events, calYear, calMonth]);

  // ── CRUD handlers ────────────────────────────────────────────────────

  const handleCreate = () => {
    if (!createForm.title || !createForm.date || !createForm.framework || !createForm.owner) {
      toast.error('Please fill in all required fields');
      return;
    }
    const newEvent: CalendarEvent = {
      id: `EVT-${String(events.length + 1).padStart(3, '0')}`,
      ...createForm,
    };
    setEvents(prev => [...prev, newEvent].sort((a, b) => a.date.localeCompare(b.date)));
    setCreateOpen(false);
    setCreateForm({ title: '', date: '', type: 'audit', framework: '', owner: '', status: 'Upcoming' });
    toast.success(`Event "${newEvent.title}" scheduled`);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setEvents(prev => prev.filter(e => e.id !== deleteTarget.id));
    toast.success(`Event "${deleteTarget.title}" removed`);
    setDeleteTarget(null);
  };

  const selectedDayEvents = selectedDay ? (eventsForMonth[selectedDay] || []) : [];

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
    setSelectedDay(null);
  }

  // ── KPIs ─────────────────────────────────────────────────────────────

  const kpis = [
    { label: 'This Month Events', value: thisMonthEvents.length, color: 'hsl(var(--s-in-tx))', icon: CalendarBlank },
    { label: 'Overdue', value: overdueCount, color: 'hsl(var(--destructive))', icon: Warning },
    { label: 'Coming 30 Days', value: coming30.length, color: 'hsl(var(--s-wn-tx))', icon: Clock },
    { label: 'Coming 90 Days', value: coming90.length, color: 'hsl(var(--s-ok-tx))', icon: CalendarBlank },
  ];

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>
            Compliance Calendar
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
            Upcoming audits, reviews, deadlines, and certifications for {orgName}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid hsl(var(--border))' }}>
            <button
              onClick={() => setView('list')}
              style={{
                padding: '6px 12px',
                background: view === 'list' ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))',
                color: view === 'list' ? '#fff' : 'hsl(var(--text-3))',
                border: 'none',
                borderRadius: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
              }}
            >
              <List size={13} /> List
            </button>
            <button
              onClick={() => setView('calendar')}
              style={{
                padding: '6px 12px',
                background: view === 'calendar' ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))',
                color: view === 'calendar' ? '#fff' : 'hsl(var(--text-3))',
                border: 'none',
                borderRadius: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
              }}
            >
              <GridFour size={13} /> Calendar
            </button>
          </div>
          <button
            onClick={() => exportCSV(filtered)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              background: 'hsl(var(--bg-surface))',
              color: 'hsl(var(--text-3))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 0,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Export size={14} /> Export CSV
          </button>
          <Button
            size="sm"
            style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff', gap: 6 }}
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={14} weight="bold" /> Schedule Event
          </Button>
        </div>
      </div>

      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div
          style={{
            background: 'hsla(0, 84%, 60%, 0.08)',
            border: '1px solid hsl(var(--destructive))',
            borderRadius: 0,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Warning size={16} style={{ color: 'hsl(var(--destructive))', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--destructive))' }}>
            {overdueCount} overdue compliance event{overdueCount > 1 ? 's' : ''} require immediate attention
          </span>
          <button
            onClick={() => { setFilterStatus('Overdue'); setView('list'); }}
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: 'hsl(var(--destructive))',
              background: 'none',
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            View Overdue
          </button>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(k => (
          <MetricTile key={k.label} label={k.label} value={k.value} color={k.color} icon={k.icon} />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {(Object.keys(typeColors) as EventType[]).map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: typeColors[t],
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, color: 'hsl(var(--text-3))', textTransform: 'capitalize' }}>
              {typeLabels[t]}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <MagnifyingGlass
            size={13}
            style={{
              position: 'absolute',
              left: 9,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'hsl(var(--text-3))',
            }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events, frameworks, owners..."
            style={{
              width: '100%',
              padding: '7px 10px 7px 28px',
              background: 'hsl(var(--bg-surface))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 0,
              color: 'hsl(var(--text-1))',
              fontSize: 13,
              outline: 'none',
                          }}
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{
            padding: '7px 10px',
            background: 'hsl(var(--bg-surface))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 0,
            color: 'hsl(var(--text-3))',
            fontSize: 13,
          }}
        >
          <option value="all">All Types</option>
          <option value="audit">Audit</option>
          <option value="review">Review</option>
          <option value="deadline">Deadline</option>
          <option value="certification">Certification</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: '7px 10px',
            background: 'hsl(var(--bg-surface))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 0,
            color: 'hsl(var(--text-3))',
            fontSize: 13,
          }}
        >
          <option value="all">All Status</option>
          <option value="Overdue">Overdue</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Completed">Completed</option>
        </select>
        {(filterType !== 'all' || filterStatus !== 'all' || search) && (
          <button
            onClick={() => {
              setFilterType('all');
              setFilterStatus('all');
              setSearch('');
            }}
            style={{
              padding: '7px 10px',
              background: 'none',
              border: '1px solid hsl(var(--border))',
              borderRadius: 0,
              color: 'hsl(var(--text-3))',
              cursor: 'pointer',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* ── Calendar Grid View ──────────────────────────────────────────── */}
      {view === 'calendar' && (
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Calendar grid */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                background: 'hsl(var(--bg-surface))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 0,
              }}
            >
              {/* Month navigation */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid hsl(var(--border))',
                }}
              >
                <button
                  onClick={prevMonth}
                  style={{
                    background: 'none',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 0,
                    cursor: 'pointer',
                    color: 'hsl(var(--text-3))',
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <CaretLeft size={14} />
                </button>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'hsl(var(--text-1))',
                  }}
                >
                  {MONTH_NAMES[calMonth]} {calYear}
                </span>
                <button
                  onClick={nextMonth}
                  style={{
                    background: 'none',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 0,
                    cursor: 'pointer',
                    color: 'hsl(var(--text-3))',
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <CaretRight size={14} />
                </button>
              </div>

              {/* Day headers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  borderBottom: '1px solid hsl(var(--border))',
                }}
              >
                {DAY_HEADERS.map(d => (
                  <div
                    key={d}
                    style={{
                      padding: '8px 0',
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'hsl(var(--text-4))',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                }}
              >
                {/* Empty cells for offset */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    style={{
                      minHeight: 80,
                      borderBottom: '1px solid hsl(var(--border))',
                      borderRight: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--bg-muted))',
                    }}
                  />
                ))}
                {/* Actual days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = eventsForMonth[day] || [];
                  const isToday =
                    calYear === 2026 && calMonth === 3 && day === 8;
                  const isSelected = selectedDay === day;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                      style={{
                        minHeight: 80,
                        padding: '6px 8px',
                        borderBottom: '1px solid hsl(var(--border))',
                        borderRight: (firstDay + day) % 7 !== 0 ? '1px solid hsl(var(--border))' : 'none',
                        cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                        background: isSelected
                          ? 'hsl(var(--bg-muted))'
                          : isToday
                          ? 'hsla(var(--brand), 0.05)'
                          : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: isToday ? 700 : 400,
                          color: isToday ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
                          marginBottom: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {isToday && (
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: 'hsl(var(--brand))',
                            }}
                          />
                        )}
                        {day}
                      </div>
                      {/* Event dots */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {dayEvents.slice(0, 3).map(ev => (
                          <div
                            key={ev.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: typeColors[ev.type],
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 10,
                                color: 'hsl(var(--text-3))',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 90,
                              }}
                            >
                              {ev.title.split(' ').slice(0, 3).join(' ')}
                            </span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <span style={{ fontSize: 9, color: 'hsl(var(--text-4))' }}>
                            +{dayEvents.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Side panel: selected day detail */}
          <div style={{ width: 320, flexShrink: 0 }}>
            <div
              style={{
                background: 'hsl(var(--bg-surface))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 0,
                height: '100%',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid hsl(var(--border))',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'hsl(var(--text-1))',
                  }}
                >
                  {selectedDay
                    ? `${MONTH_NAMES[calMonth]} ${selectedDay}, ${calYear}`
                    : 'Select a Day'}
                </span>
                {selectedDay && (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'hsl(var(--text-4))',
                      marginLeft: 8,
                    }}
                  >
                    {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div style={{ padding: 16 }}>
                {!selectedDay && (
                  <div
                    style={{
                      padding: '32px 0',
                      textAlign: 'center',
                      color: 'hsl(var(--text-4))',
                    }}
                  >
                    <CalendarBlank size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    <p style={{ fontSize: 12 }}>Click a day on the calendar to view events</p>
                  </div>
                )}
                {selectedDay && selectedDayEvents.length === 0 && (
                  <div
                    style={{
                      padding: '32px 0',
                      textAlign: 'center',
                      color: 'hsl(var(--text-4))',
                    }}
                  >
                    <CalendarBlank size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    <p style={{ fontSize: 12 }}>No events on this day</p>
                  </div>
                )}
                {selectedDayEvents.map(ev => (
                  <div
                    key={ev.id}
                    style={{
                      padding: '12px',
                      background: 'hsl(var(--bg-muted))',
                      border: '1px solid hsl(var(--border))',
                      borderLeft: `3px solid ${typeColors[ev.type]}`,
                      borderRadius: 0,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 6,
                      }}
                    >
                      <Badge
                        style={{
                          background: typeColors[ev.type] + '18',
                          color: typeColors[ev.type],
                          border: `1px solid ${typeColors[ev.type]}40`,
                          borderRadius: 0,
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {typeLabels[ev.type]}
                      </Badge>
                      <Badge
                        style={{
                          background:
                            ev.status === 'Overdue'
                              ? 'hsla(0, 84%, 60%, 0.1)'
                              : 'hsl(var(--bg-muted))',
                          color:
                            ev.status === 'Overdue'
                              ? 'hsl(var(--destructive))'
                              : 'hsl(var(--text-3))',
                          border:
                            ev.status === 'Overdue'
                              ? '1px solid hsl(var(--destructive))'
                              : '1px solid hsl(var(--border))',
                          borderRadius: 0,
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {ev.status}
                      </Badge>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'hsl(var(--text-1))',
                        lineHeight: 1.4,
                        marginBottom: 6,
                      }}
                    >
                      {ev.title}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        color: 'hsl(var(--text-4))',
                      }}
                    >
                      <span>{ev.framework}</span>
                      <span>{ev.owner}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── List View ───────────────────────────────────────────────────── */}
      {view === 'list' && (
        <div
          style={{
            background: 'hsl(var(--bg-surface))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 0,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'hsl(var(--bg-muted))' }}>
                {['Date', 'Event', 'Type', 'Framework', 'Status', 'Owner'].map(h => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      fontWeight: 600,
                      fontSize: 11,
                      color: 'hsl(var(--text-4))',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      borderBottom: '1px solid hsl(var(--border))',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev, i) => (
                <tr
                  key={ev.id}
                  style={{
                    borderBottom:
                      i < filtered.length - 1
                        ? '1px solid hsl(var(--border))'
                        : 'none',
                    background:
                      ev.status === 'Overdue'
                        ? 'hsla(0, 84%, 60%, 0.04)'
                        : 'transparent',
                  }}
                >
                  {/* Date */}
                  <td
                    style={{
                      padding: '10px 14px',
                      whiteSpace: 'nowrap',
                      color: 'hsl(var(--text-3))',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CalendarBlank size={12} style={{ color: 'hsl(var(--text-4))' }} />
                      {formatDate(ev.date)}
                    </div>
                  </td>
                  {/* Event title */}
                  <td
                    style={{
                      padding: '10px 14px',
                      fontWeight: 500,
                      color: 'hsl(var(--text-1))',
                      maxWidth: 340,
                    }}
                  >
                    <span
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {ev.title}
                    </span>
                  </td>
                  {/* Type */}
                  <td style={{ padding: '10px 14px' }}>
                    <Badge
                      style={{
                        background: typeColors[ev.type] + '18',
                        color: typeColors[ev.type],
                        border: `1px solid ${typeColors[ev.type]}40`,
                        borderRadius: 0,
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {typeLabels[ev.type]}
                    </Badge>
                  </td>
                  {/* Framework */}
                  <td style={{ padding: '10px 14px' }}>
                    <Badge
                      style={{
                        background: 'hsl(var(--bg-muted))',
                        color: 'hsl(var(--text-3))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 0,
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {ev.framework}
                    </Badge>
                  </td>
                  {/* Status */}
                  <td style={{ padding: '10px 14px' }}>
                    <Badge
                      style={{
                        background:
                          ev.status === 'Overdue'
                            ? 'hsla(0, 84%, 60%, 0.1)'
                            : ev.status === 'Completed'
                            ? 'hsla(142, 71%, 45%, 0.1)'
                            : 'hsl(var(--bg-muted))',
                        color:
                          ev.status === 'Overdue'
                            ? 'hsl(var(--destructive))'
                            : ev.status === 'Completed'
                            ? 'hsl(var(--s-ok-tx))'
                            : 'hsl(var(--s-in-tx))',
                        border:
                          ev.status === 'Overdue'
                            ? '1px solid hsl(var(--destructive))'
                            : ev.status === 'Completed'
                            ? '1px solid hsl(var(--s-ok-tx))'
                            : '1px solid hsl(var(--border))',
                        borderRadius: 0,
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {ev.status}
                    </Badge>
                  </td>
                  {/* Owner */}
                  <td
                    style={{
                      padding: '10px 14px',
                      color: 'hsl(var(--text-3))',
                      fontSize: 12,
                    }}
                  >
                    {ev.owner}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      onClick={() => setDeleteTarget(ev)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--destructive))', padding: 4, borderRadius: 0 }}
                      title="Delete event"
                    >
                      <Trash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                color: 'hsl(var(--text-4))',
              }}
            >
              <CalendarBlank size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>No events match your filters</p>
            </div>
          )}
          <div
            style={{
              padding: '10px 14px',
              borderTop: '1px solid hsl(var(--border))',
              fontSize: 12,
              color: 'hsl(var(--text-4))',
            }}
          >
            {filtered.length} of {events.length} events
          </div>
        </div>
      )}
      {/* ── Schedule Event Dialog ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))', }}>Schedule Compliance Event</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            <div>
              <Label style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>Event Title *</Label>
              <input
                placeholder="e.g. SOC 2 Annual Audit"
                value={createForm.title}
                onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                style={{ width: '100%', marginTop: 4, padding: '8px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0, color: 'hsl(var(--text-1))', fontSize: 13, }}
              />
            </div>
            <div>
              <Label style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>Date *</Label>
              <input
                type="date"
                value={createForm.date}
                onChange={e => setCreateForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: '100%', marginTop: 4, padding: '8px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0, color: 'hsl(var(--text-1))', fontSize: 13, }}
              />
            </div>
            <div>
              <Label style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>Event Type *</Label>
              <Select value={createForm.type} onValueChange={v => setCreateForm(f => ({ ...f, type: v as EventType }))}>
                <SelectTrigger style={{ marginTop: 4, borderRadius: 0, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="audit">Audit</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="certification">Certification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>Framework *</Label>
              <input
                placeholder="e.g. ISO 42001, EU AI Act, SOC 2"
                value={createForm.framework}
                onChange={e => setCreateForm(f => ({ ...f, framework: e.target.value }))}
                style={{ width: '100%', marginTop: 4, padding: '8px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0, color: 'hsl(var(--text-1))', fontSize: 13, }}
              />
            </div>
            <div>
              <Label style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>Owner *</Label>
              <input
                placeholder="e.g. Sarah Chen"
                value={createForm.owner}
                onChange={e => setCreateForm(f => ({ ...f, owner: e.target.value }))}
                style={{ width: '100%', marginTop: 4, padding: '8px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0, color: 'hsl(var(--text-1))', fontSize: 13, }}
              />
            </div>
            <div>
              <Label style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>Status</Label>
              <Select value={createForm.status} onValueChange={v => setCreateForm(f => ({ ...f, status: v as EventStatus }))}>
                <SelectTrigger style={{ marginTop: 4, borderRadius: 0, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter style={{ marginTop: 8 }}>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }} onClick={handleCreate}>Schedule Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title={`Delete Event: ${deleteTarget?.title}`}
        description="This will permanently remove this compliance event from the calendar."
        confirmLabel="Delete Event"
        isDestructive
        impactList={[
          'Event removed from compliance calendar',
          'Calendar metrics will update',
        ]}
        onConfirm={handleDelete}
      />
    </div>
  );
}
