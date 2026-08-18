// SPDX-License-Identifier: Apache-2.0
// Compliance Calendar — the aggregation point of the platform. Manual entries
// live in the org-scoped compliance_calendar table; deadline events are
// DERIVED live from conformity assessments, exceptions, tabletop exercises,
// regulator filings and AI trainings (useCalendar merges both). Derived
// events deep-link to their source module and are never editable here.
// The grid opens on the real current month — no hardcoded clock.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { StatCardRow } from '../../components/ui/StatCardRow';
import type { StatCardRowItem } from '../../components/ui/StatCardRow';
import { FilterBar } from '../../components/ui/FilterBar';
import { InterlinkChip } from '../../components/ui/InterlinkChip';
import {
  CalendarBlank, Export, List, GridFour, Warning, Clock,
  CaretLeft, CaretRight, Plus, Trash, PencilSimple,
} from '@phosphor-icons/react';
import { useOrgName } from '../../hooks/useOrganization';
import { useCalendar } from '../../hooks/useComplianceGroup';
import type { CalendarEventRecord } from '../../services/complianceOpsService';
import { exportCsv } from '../../lib/exportUtils';
import { severityColor, formatDate } from '../../data/seed';

/* ── Source styling — one color per governed source module ─────────────── */

const SOURCE_STYLES: Record<string, { color: string; label: string }> = {
  manual: { color: 'hsl(var(--brand))', label: 'Manual' },
  conformity: { color: 'hsl(var(--tag-purple))', label: 'Conformity' },
  exception: { color: 'hsl(var(--s-er-tx))', label: 'Exception' },
  tabletop: { color: 'hsl(var(--s-in-tx))', label: 'Tabletop' },
  filing: { color: 'hsl(var(--s-wn-tx))', label: 'Filing' },
  training: { color: 'hsl(var(--s-ok-tx))', label: 'Training' },
};
const sourceStyle = (t: string) => SOURCE_STYLES[t] ?? { color: 'hsl(var(--text-4))', label: t };

const MANUAL_TYPES = ['deadline', 'review', 'audit', 'certification', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

// An event with a due date in the past is overdue unless its source record
// reports a terminal status.
const DONE_STATUSES = new Set(['done', 'completed', 'closed', 'resolved', 'submitted', 'acknowledged', 'cancelled']);
const isOverdue = (e: CalendarEventRecord): boolean =>
  !!e.dueAt && new Date(e.dueAt).getTime() < Date.now() && !DONE_STATUSES.has((e.status ?? '').toLowerCase());

const dayKey = (dueAt: string | null): string | null => (dueAt ? dueAt.slice(0, 10) : null);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface EventForm {
  id?: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  owner: string;
  dueAt: string;
  frameworkRef: string;
}

const EMPTY_FORM: EventForm = {
  title: '', description: '', type: 'deadline', severity: '',
  owner: '', dueAt: '', frameworkRef: '',
};

function SourceBadge({ e }: { e: CalendarEventRecord }) {
  const s = sourceStyle(e.sourceType);
  return (
    <Badge style={{
      background: `${'color-mix(in srgb, '}${s.color} 12%, transparent)`,
      color: s.color,
      border: `1px solid ${s.color}`,
      borderRadius: 0, fontSize: 10, fontWeight: 600,
    }}>
      {s.label}
    </Badge>
  );
}

export default function ComplianceCalendar() {
  const orgName = useOrgName();
  const navigate = useNavigate();
  const { items, isLoading, error, save, remove, isSaving } = useCalendar();

  const now = new Date();
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterTimeliness, setFilterTimeliness] = useState('all');
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // yyyy-mm-dd
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEventRecord | null>(null);

  // Keep the side panel in sync when the month changes.
  useEffect(() => { setSelectedDay(null); }, [calYear, calMonth]);

  const filtered = useMemo(() => items.filter(e => {
    if (search) {
      const q = search.toLowerCase();
      const hay = [e.title, e.frameworkRef, e.owner, e.sourceType].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterSource !== 'all' && e.sourceType !== filterSource) return false;
    if (filterTimeliness === 'overdue' && !isOverdue(e)) return false;
    if (filterTimeliness === 'upcoming' && (!e.dueAt || new Date(e.dueAt).getTime() < Date.now())) return false;
    return true;
  }), [items, search, filterSource, filterTimeliness]);

  const overdue = useMemo(() => items.filter(isOverdue), [items]);
  const next30 = useMemo(() => {
    const nowT = Date.now();
    const horizon = nowT + 30 * 86400000;
    return items
      .filter(e => e.dueAt && new Date(e.dueAt).getTime() >= nowT && new Date(e.dueAt).getTime() <= horizon)
      .sort((a, b) => (a.dueAt! < b.dueAt! ? -1 : 1));
  }, [items]);
  const thisMonth = useMemo(() => {
    const prefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
    return items.filter(e => dayKey(e.dueAt)?.startsWith(prefix));
  }, [items, calYear, calMonth]);

  const eventsForMonth = useMemo(() => {
    const map: Record<string, CalendarEventRecord[]> = {};
    for (const e of thisMonth) {
      const key = dayKey(e.dueAt);
      if (!key) continue;
      (map[key] ??= []).push(e);
    }
    return map;
  }, [thisMonth]);

  const kpis: StatCardRowItem[] = [
    { label: `${MONTH_NAMES[calMonth]} Events`, value: items.length === 0 ? '—' : String(thisMonth.length), icon: <CalendarBlank size={18} style={{ color: 'hsl(var(--s-in-tx))' }} /> },
    { label: 'Overdue', value: items.length === 0 ? '—' : String(overdue.length), icon: <Warning size={18} style={{ color: 'hsl(var(--destructive))' }} /> },
    { label: 'Next 30 Days', value: items.length === 0 ? '—' : String(next30.length), icon: <Clock size={18} style={{ color: 'hsl(var(--s-wn-tx))' }} /> },
    { label: 'Manual Entries', value: items.length === 0 ? '—' : String(items.filter(e => !e.isDerived).length), icon: <PencilSimple size={18} style={{ color: 'hsl(var(--brand))' }} /> },
  ];

  /* ── Handlers (success toasts fire from the hook only) ─────────────── */

  const openCreate = (presetDay?: string) => {
    setForm({ ...EMPTY_FORM, dueAt: presetDay ?? '' });
    setDialogOpen(true);
  };
  const openEdit = (e: CalendarEventRecord) => {
    if (e.isDerived) return;
    setForm({
      id: e.id,
      title: e.title,
      description: e.description ?? '',
      type: e.type ?? 'deadline',
      severity: e.severity ?? '',
      owner: e.owner ?? '',
      dueAt: dayKey(e.dueAt) ?? '',
      frameworkRef: e.frameworkRef ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const existing = form.id ? items.find(e => e.id === form.id) : undefined;
    const record: CalendarEventRecord = {
      id: form.id,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      status: existing?.status,
      type: form.type,
      severity: form.severity || undefined,
      owner: form.owner.trim() || null,
      dueAt: form.dueAt || null,
      frameworkRef: form.frameworkRef.trim() || null,
      sourceType: 'manual',
      isDerived: false,
    };
    try {
      await save(record); // hook toasts success; throws on failure
      setDialogOpen(false);
    } catch { /* hook surfaces the error toast */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id || deleteTarget.isDerived) return;
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } catch { /* hook surfaces the error toast */ }
  };

  const handleExport = () => {
    if (!filtered.length) return;
    exportCsv(
      filtered.map(e => ({
        title: e.title,
        due_at: e.dueAt ?? '',
        type: e.type ?? '',
        source: e.sourceType,
        status: e.status ?? '',
        severity: e.severity ?? '',
        owner: e.owner ?? '',
        framework: e.frameworkRef ?? '',
        derived: e.isDerived ? 'yes' : 'no',
      })),
      'compliance-calendar.csv',
    );
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1);
  };

  if (isLoading) return <PageSkeleton />;

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const todayKey = new Date().toISOString().slice(0, 10);
  const selectedDayEvents = selectedDay ? (eventsForMonth[selectedDay] ?? []) : [];

  /* ── Event row (side panel + upcoming list) ─────────────────────────── */
  const EventRow = ({ e }: { e: CalendarEventRecord }) => {
    const s = sourceStyle(e.sourceType);
    const sev = e.severity ? severityColor(e.severity) : null;
    return (
      <div className="p-3 mb-2" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderLeft: `3px solid ${s.color}` }}>
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <SourceBadge e={e} />
          {isOverdue(e) && (
            <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))', borderRadius: 0, fontSize: 10, fontWeight: 600 }}>
              Overdue
            </Badge>
          )}
          {sev && (
            <Badge style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}`, borderRadius: 0, fontSize: 10, textTransform: 'uppercase' }}>
              {e.severity}
            </Badge>
          )}
          {e.status && <Badge variant="outline" style={{ borderRadius: 0, fontSize: 9 }}>{e.status.replace(/_/g, ' ')}</Badge>}
        </div>
        <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-1))', lineHeight: 1.4 }}>{e.title}</p>
        <div className="flex items-center justify-between text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>
          <span>{e.dueAt ? formatDate(e.dueAt) : 'No date'}{e.frameworkRef ? ` · ${e.frameworkRef}` : ''}</span>
          <span>{e.owner ?? ''}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          {e.isDerived && e.route ? (
            /* Derived events are managed in their source module. */
            <InterlinkChip label="Open source record" to={e.route} />
          ) : (
            <>
              <Button size="sm" variant="ghost" style={{ borderRadius: 0, height: 24, padding: '2px 6px' }} onClick={() => openEdit(e)} aria-label="Edit entry">
                <PencilSimple size={12} />
              </Button>
              <Button size="sm" variant="ghost" style={{ borderRadius: 0, height: 24, padding: '2px 6px', color: 'hsl(var(--destructive))' }} onClick={() => setDeleteTarget(e)} aria-label="Delete entry">
                <Trash size={12} />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Calendar"
        subtitle={`${orgName} · Manual entries merged with live deadlines from conformity, exceptions, tabletops, filings and trainings`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Compliance Calendar' }]}
        actions={
          <div className="flex gap-2 items-center">
            <div style={{ display: 'flex', border: '1px solid hsl(var(--border))' }}>
              {([['calendar', GridFour, 'Calendar'], ['list', List, 'List']] as const).map(([v, Icon, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '6px 12px', border: 'none', borderRadius: 0, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                    background: view === v ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))',
                    color: view === v ? 'hsl(var(--bg-surface))' : 'hsl(var(--text-3))',
                  }}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={!filtered.length} style={{ borderRadius: 0 }}>
              <Export size={14} /> Export CSV
            </Button>
            <Button size="sm" style={{ borderRadius: 0 }} onClick={() => openCreate()}>
              <Plus size={14} /> Add Entry
            </Button>
          </div>
        }
      />

      <StatCardRow cards={kpis} />

      {error && (
        <div role="alert" className="p-3 text-sm" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))' }}>
          Failed to load the compliance calendar: {(error as Error).message}
        </div>
      )}

      {overdue.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--destructive))' }}>
          <Warning size={16} style={{ color: 'hsl(var(--destructive))', flexShrink: 0 }} />
          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--destructive))' }}>
            {overdue.length} overdue compliance deadline{overdue.length > 1 ? 's' : ''}
          </span>
          <button
            className="ml-auto text-xs hover:underline"
            style={{ color: 'hsl(var(--destructive))', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => { setFilterTimeliness('overdue'); setView('list'); }}
          >
            View overdue
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 items-center flex-wrap">
        {Object.entries(SOURCE_STYLES).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0, display: 'inline-block' }} />
            <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search events, frameworks, owners…"
        filters={[
          {
            key: 'source', label: 'Source',
            value: filterSource === 'all' ? '' : filterSource,
            onChange: (v: string) => setFilterSource(v || 'all'),
            options: Object.entries(SOURCE_STYLES).map(([value, s]) => ({ label: s.label, value })),
          },
          {
            key: 'timeliness', label: 'Timeliness',
            value: filterTimeliness === 'all' ? '' : filterTimeliness,
            onChange: (v: string) => setFilterTimeliness(v || 'all'),
            options: [
              { label: 'Overdue', value: 'overdue' },
              { label: 'Upcoming', value: 'upcoming' },
            ],
          },
        ]}
        activeFilterCount={(filterSource !== 'all' ? 1 : 0) + (filterTimeliness !== 'all' ? 1 : 0)}
        onClearAll={() => { setSearch(''); setFilterSource('all'); setFilterTimeliness('all'); }}
        trailing={
          <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
            {filtered.length} of {items.length} events
          </span>
        }
      />

      {!error && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
          <CalendarBlank size={40} />
          <p className="mt-3 text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>No compliance deadlines yet</p>
          <p className="text-xs mt-1 max-w-md">
            Deadlines appear here automatically as conformity assessments, exceptions, filings,
            tabletop exercises and trainings are recorded — or add a manual entry.
          </p>
          <Button size="sm" className="mt-4" style={{ borderRadius: 0 }} onClick={() => openCreate()}>
            <Plus size={14} /> Add Entry
          </Button>
        </div>
      ) : view === 'calendar' ? (
        <div className="flex gap-4 items-start">
          {/* Month grid */}
          <div className="flex-1" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <button onClick={prevMonth} aria-label="Previous month" style={{ background: 'none', border: '1px solid hsl(var(--border))', borderRadius: 0, cursor: 'pointer', color: 'hsl(var(--text-3))', padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
                <CaretLeft size={14} />
              </button>
              <span className="text-[15px] font-bold" style={{ color: 'hsl(var(--text-1))' }}>{MONTH_NAMES[calMonth]} {calYear}</span>
              <button onClick={nextMonth} aria-label="Next month" style={{ background: 'none', border: '1px solid hsl(var(--border))', borderRadius: 0, cursor: 'pointer', color: 'hsl(var(--text-3))', padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
                <CaretRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-7" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              {DAY_HEADERS.map(d => (
                <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))', letterSpacing: '0.06em' }}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} style={{ minHeight: 84, borderBottom: '1px solid hsl(var(--border))', borderRight: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvents = eventsForMonth[key] ?? [];
                const isToday = key === todayKey;
                const isSelected = selectedDay === key;
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedDay(isSelected ? null : key)}
                    style={{
                      minHeight: 84, padding: '6px 8px',
                      borderBottom: '1px solid hsl(var(--border))',
                      borderRight: (firstDay + day) % 7 !== 0 ? '1px solid hsl(var(--border))' : 'none',
                      cursor: 'pointer',
                      background: isSelected ? 'hsl(var(--bg-muted))' : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-1 mb-1" style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                      {isToday && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'hsl(var(--brand))', display: 'inline-block' }} />}
                      {day}
                    </div>
                    <div className="flex flex-col gap-[3px]">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div key={ev.id} className="flex items-center gap-1">
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sourceStyle(ev.sourceType).color, flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ fontSize: 10, color: 'hsl(var(--text-3))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 92 }}>
                            {ev.title}
                          </span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span style={{ fontSize: 9, color: 'hsl(var(--text-4))' }}>+{dayEvents.length - 3} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side panel */}
          <div style={{ width: 320, flexShrink: 0 }}>
            <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <div className="px-4 py-3 flex items-baseline gap-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <span className="text-[13px] font-bold" style={{ color: 'hsl(var(--text-1))' }}>
                  {selectedDay ? formatDate(selectedDay) : 'Select a day'}
                </span>
                {selectedDay && (
                  <span className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>
                    {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="p-4">
                {!selectedDay ? (
                  <div className="py-8 text-center" style={{ color: 'hsl(var(--text-4))' }}>
                    <CalendarBlank size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    <p className="text-xs">Click a day on the calendar to view its deadlines</p>
                  </div>
                ) : selectedDayEvents.length === 0 ? (
                  <div className="py-8 text-center" style={{ color: 'hsl(var(--text-4))' }}>
                    <CalendarBlank size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    <p className="text-xs">No events on this day</p>
                    <Button size="sm" variant="outline" className="mt-3" style={{ borderRadius: 0 }} onClick={() => openCreate(selectedDay)}>
                      <Plus size={12} /> Add entry
                    </Button>
                  </div>
                ) : (
                  selectedDayEvents.map(e => <EventRow key={e.id} e={e} />)
                )}
              </div>
            </div>

            {/* Upcoming (next 30 days) */}
            <div className="mt-4" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <span className="text-[13px] font-bold" style={{ color: 'hsl(var(--text-1))' }}>Next 30 Days</span>
              </div>
              <div className="p-4">
                {next30.length === 0 ? (
                  <p className="text-xs py-4 text-center" style={{ color: 'hsl(var(--text-4))' }}>Nothing due in the next 30 days</p>
                ) : (
                  next30.slice(0, 8).map(e => (
                    <div key={e.id} className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: sourceStyle(e.sourceType).color, flexShrink: 0, display: 'inline-block' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{e.title}</p>
                        <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(e.dueAt!)}{e.owner ? ` · ${e.owner}` : ''}</p>
                      </div>
                      {e.isDerived && e.route ? (
                        <InterlinkChip label={sourceStyle(e.sourceType).label} to={e.route} />
                      ) : (
                        <Badge variant="outline" style={{ borderRadius: 0, fontSize: 9 }}>manual</Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── List view ── */
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                  <tr>
                    {['Due', 'Event', 'Source', 'Type', 'Framework', 'Status', 'Owner', ''].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} style={{ borderTop: '1px solid hsl(var(--border))', background: isOverdue(e) ? 'hsl(var(--s-er-bg))' : 'transparent' }}>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: isOverdue(e) ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-3))', fontWeight: isOverdue(e) ? 600 : 400 }}>
                        {e.dueAt ? formatDate(e.dueAt) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium max-w-[320px] truncate" style={{ color: 'hsl(var(--text-1))' }}>{e.title}</td>
                      <td className="px-3 py-2.5"><SourceBadge e={e} /></td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{e.type ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{e.frameworkRef ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{e.status ? e.status.replace(/_/g, ' ') : '—'}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{e.owner ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {e.isDerived && e.route ? (
                            <Button size="sm" variant="ghost" style={{ borderRadius: 0, height: 26, padding: '2px 8px', fontSize: 11 }} onClick={() => navigate(e.route!)}>
                              Open source
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" style={{ padding: '2px 6px' }} onClick={() => openEdit(e)} aria-label="Edit entry">
                                <PencilSimple size={13} />
                              </Button>
                              <Button size="sm" variant="ghost" style={{ padding: '2px 6px', color: 'hsl(var(--destructive))' }} onClick={() => setDeleteTarget(e)} aria-label="Delete entry">
                                <Trash size={13} />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-3))' }}>
                <CalendarBlank size={32} />
                <p className="mt-2 text-sm">No events match the current filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Manual Entry Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={o => !o && setDialogOpen(false)}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 500 }}>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Calendar Entry' : 'Add Calendar Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Title *</Label>
              <Input style={{ borderRadius: 0 }} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Description</Label>
              <Textarea rows={2} style={{ borderRadius: 0 }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger style={{ borderRadius: 0, width: '100%' }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {MANUAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Severity</Label>
                <Select value={form.severity || 'none'} onValueChange={v => setForm(p => ({ ...p, severity: v === 'none' ? '' : v }))}>
                  <SelectTrigger style={{ borderRadius: 0, width: '100%' }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value="none">Not set</SelectItem>
                    {SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Due Date</Label>
                <Input type="date" style={{ borderRadius: 0 }} value={form.dueAt} onChange={e => setForm(p => ({ ...p, dueAt: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Owner</Label>
                <Input style={{ borderRadius: 0 }} placeholder="Responsible team or role" value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-3))' }}>Framework Ref</Label>
              <Input style={{ borderRadius: 0 }} placeholder="e.g. EU AI Act Art. 43, ISO/IEC 42001 §9" value={form.frameworkRef} onChange={e => setForm(p => ({ ...p, frameworkRef: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} disabled={!form.title.trim() || isSaving} onClick={handleSave}>
              {isSaving ? 'Saving…' : form.id ? 'Save Changes' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation (manual entries only) ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        title={`Delete entry: ${deleteTarget?.title ?? ''}`}
        description="This removes the manual calendar entry. Deadlines derived from other modules are unaffected — they are managed in their source module."
        confirmLabel="Delete Entry"
        isDestructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
