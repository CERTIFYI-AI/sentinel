import { useState, useCallback, useEffect } from 'react';
import { useTaskData } from '../hooks/useTaskData';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  ClipboardText, Clock, CheckCircle, Warning, Plus, MagnifyingGlass,
  Funnel, Table, Trash, PencilSimple, X,
  CalendarBlank, User, ArrowUp, Rows, Kanban, CaretDown, DotsSixVertical,
} from '@phosphor-icons/react';
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GAPS, RISKS, USERS, severityColor, statusColor, formatDate } from '../data/seed';
import type { Severity } from '../data/seed';


// ── Task data derived from GAPS + RISKS ─────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'overdue' | 'blocked';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Severity;
  status: TaskStatus;
  assignee: string;
  dueDate: string;
  source: string;
  sourceType: 'gap' | 'risk';
  sourceLink: string;
}

// SLA badge calculation
function SlaBadge({ dueDate, status }: { dueDate: string; status: TaskStatus }) {
  if (status === 'done') return null;
  const today = new Date();
  const due = new Date(dueDate);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return (
    <span style={{ fontSize: 9, fontWeight: 700, color: 'hsl(var(--s-er-tx))', background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', padding: '1px 5px', animation: 'pulse 2s infinite' }}>
      OVERDUE
    </span>
  );
  if (days === 0) return (
    <span style={{ fontSize: 9, fontWeight: 700, color: 'hsl(var(--s-er-tx))', background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', padding: '1px 5px' }}>
      DUE TODAY
    </span>
  );
  if (days <= 3) return (
    <span style={{ fontSize: 9, fontWeight: 600, color: 'hsl(var(--s-wn-tx))', background: 'hsl(var(--s-wn-bg))', border: '1px solid hsl(var(--s-wn-br))', padding: '1px 5px' }}>
      {days}d left
    </span>
  );
  return (
    <span style={{ fontSize: 9, fontWeight: 500, color: 'hsl(var(--s-ok-tx))', background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))', padding: '1px 5px' }}>
      {days}d left
    </span>
  );
}

export const TASKS: Task[] = [
  {
    id: 'TSK-001',
    title: 'Update risk assessment for LLM deployment scenarios',
    description: 'Current risk assessment methodology does not adequately cover LLM-specific risks. Update FMEA templates and approval workflows.',
    priority: 'critical',
    status: 'overdue',
    assignee: 'Raj Gupta',
    dueDate: '2026-04-30',
    source: 'GAP-001',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-002',
    title: 'Complete EU AI Act Article 11 documentation',
    description: 'Technical documentation for high-risk AI systems must meet Article 13 transparency requirements. Affected: MDL-001, MDL-004.',
    priority: 'critical',
    status: 'in_progress',
    assignee: 'Raj Gupta',
    dueDate: '2026-05-15',
    source: 'GAP-002',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-003',
    title: 'Implement SHAP explainability for automated credit decisions',
    description: 'No meaningful explanation provided for automated credit decisions — violates GDPR Art. 22. Deploy SHAP pipeline on MDL-001.',
    priority: 'high',
    status: 'overdue',
    assignee: 'James Patel',
    dueDate: '2026-04-20',
    source: 'GAP-003',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-004',
    title: 'Remediate geographic proxy bias in MDL-001',
    description: 'ZIP code features acting as proxy for protected class in Credit Risk Scorer. Remove features, apply adversarial debiasing, retrain.',
    priority: 'critical',
    status: 'in_progress',
    assignee: 'Maria Santos',
    dueDate: '2026-04-25',
    source: 'RSK-001',
    sourceType: 'risk',
    sourceLink: '/risks',
  },
  {
    id: 'TSK-005',
    title: 'Add hallucination guardrail to Loan Approval Assistant',
    description: 'GPT-4o generating fabricated loan terms. Implement RAG pipeline and confidence threshold guardrail on MDL-004.',
    priority: 'high',
    status: 'in_progress',
    assignee: 'Raj Gupta',
    dueDate: '2026-04-28',
    source: 'RSK-002',
    sourceType: 'risk',
    sourceLink: '/risks',
  },
  {
    id: 'TSK-006',
    title: 'Renew OpenAI DPA — EU data processing',
    description: 'Update vendor DPA agreements to include AI-specific clauses. Priority: OpenAI (expired), Pinecone (pending).',
    priority: 'critical',
    status: 'overdue',
    assignee: 'James Patel',
    dueDate: '2026-04-15',
    source: 'GAP-005',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-007',
    title: 'Develop AI-specific incident response playbooks',
    description: 'Incident response does not cover AI-specific scenarios (bias incidents, LLM hallucination). Create 4 new playbook templates.',
    priority: 'high',
    status: 'in_progress',
    assignee: 'Sarah Chen',
    dueDate: '2026-05-10',
    source: 'GAP-006',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-008',
    title: 'Formalize prompt injection testing process',
    description: 'No formal process for regular prompt injection testing. Create quarterly test schedule for LLM01 OWASP coverage on MDL-004.',
    priority: 'high',
    status: 'todo',
    assignee: 'Maria Santos',
    dueDate: '2026-04-25',
    source: 'GAP-007',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-009',
    title: 'Quarantine shadow AI agents in Marketing',
    description: 'Unregistered LangChain agent accessing customer PII. Quarantine AGT-010, revoke data access, conduct department audit.',
    priority: 'critical',
    status: 'in_progress',
    assignee: 'Sarah Chen',
    dueDate: '2026-04-10',
    source: 'RSK-006',
    sourceType: 'risk',
    sourceLink: '/risks',
  },
  {
    id: 'TSK-010',
    title: 'Expand human oversight to all high-risk AI uses',
    description: 'Human oversight currently covers only credit decisions. Extend HITL gates to fraud detection, AML, and HR screening use cases.',
    priority: 'medium',
    status: 'in_progress',
    assignee: 'James Patel',
    dueDate: '2026-05-20',
    source: 'GAP-008',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-011',
    title: 'Implement automated shadow AI detection',
    description: 'Current shadow AI detection is manual. Deploy network scanning with automated alerting. Target: weekly scan cadence.',
    priority: 'high',
    status: 'todo',
    assignee: 'Sarah Chen',
    dueDate: '2026-04-30',
    source: 'GAP-010',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-012',
    title: 'Tune AML false positive detection thresholds',
    description: 'AML Transaction Monitor false positive rate trending upward causing analyst fatigue. Calibrate thresholds and add secondary scoring.',
    priority: 'high',
    status: 'in_progress',
    assignee: 'David Kim',
    dueDate: '2026-05-05',
    source: 'RSK-011',
    sourceType: 'risk',
    sourceLink: '/risks',
  },
  {
    id: 'TSK-013',
    title: 'Implement GDPR Art. 22 model explainability API',
    description: 'Automated decision-making systems lack sufficient explainability. Create explanation API endpoint with SHAP support.',
    priority: 'high',
    status: 'todo',
    assignee: 'Raj Gupta',
    dueDate: '2026-05-15',
    source: 'RSK-012',
    sourceType: 'risk',
    sourceLink: '/risks',
  },
  {
    id: 'TSK-014',
    title: 'Obtain GDPR consent for AI dataset processing',
    description: 'Consumer credit and HR datasets lack explicit AI processing consent. Obtain retroactive consent or implement anonymization.',
    priority: 'critical',
    status: 'done',
    assignee: 'James Patel',
    dueDate: '2026-03-31',
    source: 'RSK-003',
    sourceType: 'risk',
    sourceLink: '/risks',
  },
  {
    id: 'TSK-015',
    title: 'Implement model lifecycle tracking in inventory',
    description: 'Model lifecycle phases not systematically tracked. Add lifecycle state machine to model registry for all 6 models.',
    priority: 'medium',
    status: 'done',
    assignee: 'Raj Gupta',
    dueDate: '2026-04-01',
    source: 'GAP-009',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
];

// ── helpers ────────────────────────────────────────────────────────────────

const statusConfig: Record<TaskStatus, { label: string; bg: string; text: string; border: string }> = {
  todo:        { label: 'Todo',        bg: 'hsl(var(--bg-muted))',  text: 'hsl(var(--text-2))', border: 'hsl(var(--border))' },
  in_progress: { label: 'In Progress', bg: 'hsl(var(--s-in-bg))',  text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' },
  review:      { label: 'Review',      bg: 'hsl(263 30% 14%)',     text: 'hsl(263 70% 65%)',    border: 'hsl(263 30% 24%)' },
  done:        { label: 'Done',        bg: 'hsl(var(--s-ok-bg))',  text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
  overdue:     { label: 'Overdue',     bg: 'hsl(var(--s-er-bg))',  text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
  blocked:     { label: 'Blocked',     bg: 'hsl(var(--r-hi-bg))',  text: 'hsl(var(--r-hi-tx))', border: 'hsl(var(--r-hi-br))' },
};

const KANBAN_COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'blocked'];

// ── Sortable Kanban Card ────────────────────────────────────────────────────
function SortableCard({
  task, selected, onSelect, onClick,
}: {
  task: Task; selected: boolean; onSelect: (id: string) => void; onClick: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const sc = severityColor(task.priority);
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'hsl(var(--bg-surface))',
        border: `1px solid ${selected ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
        padding: 10,
        cursor: 'pointer',
        position: 'relative',
      }}
      onClick={() => onClick(task)}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: sc.text }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={e => { e.stopPropagation(); onSelect(task.id); }}
          onClick={e => e.stopPropagation()}
          style={{ width: 11, height: 11, cursor: 'pointer' }}
        />
        <SlaBadge dueDate={task.dueDate} status={task.status} />
        <span style={{ fontSize: 9, color: 'hsl(var(--text-4))', fontFamily: 'monospace', marginLeft: 'auto' }}>{task.id}</span>
        <div
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          style={{ cursor: 'grab', color: 'hsl(var(--text-4))', display: 'flex' }}
          aria-label="Drag to reorder"
        >
          <DotsSixVertical size={12} />
        </div>
      </div>
      <p style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--text-1))', lineHeight: 1.4, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {task.title}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 18, height: 18, borderRadius: '50%', background: sc.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'hsl(var(--bg-surface))' }}>
          {(task.assignee ?? '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        </span>
        <span style={{ fontSize: 10, color: 'hsl(var(--text-3))', flex: 1 }}>{(task.assignee ?? '').split(' ')[0] || '–'}</span>
        <PriorityBadge priority={task.priority} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const c = statusConfig[status];
  return (
    <Badge style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 0, fontSize: 10, fontWeight: 600 }}>
      {c.label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: Severity }) {
  const c = severityColor(priority);
  return (
    <Badge style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 0, fontSize: 10 }}>
      {priority}
    </Badge>
  );
}

function AvatarInitials({ name }: { name?: string | null }) {
  const safeName = name ?? '';
  const initials = safeName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const colors = ['hsl(var(--brand))', 'hsl(var(--r-hi-tx))', 'hsl(var(--s-ok-tx))', 'hsl(var(--s-in-tx))', '#a855f7', 'hsl(var(--s-wn-tx))'];
  const idx = safeName.charCodeAt(0) % colors.length;
  return (
    <div title={safeName} style={{
      width: 22, height: 22, borderRadius: '50%',
      background: colors[idx],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: 'hsl(var(--bg-surface))', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ── empty form ─────────────────────────────────────────────────────────────

const emptyForm = {
  title: '',
  description: '',
  priority: 'medium' as Severity,
  status: 'todo' as TaskStatus,
  assignee: '',
  dueDate: '',
  source: '',
  sourceType: 'risk' as 'gap' | 'risk',
  sourceLink: '/risks',
};

// ── main component ─────────────────────────────────────────────────────────

export default function Tasks() {
  const { tasks: liveTasks, isLoading, save, remove } = useTaskData();
  const [tasks, setTasks] = useState<Task[]>(TASKS);

  useEffect(() => {
    if (liveTasks.length > 0) setTasks(liveTasks as any[])
  }, [liveTasks]);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState<Omit<Task, 'id'>>(emptyForm);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  if (isLoading) return <PageSkeleton title="Tasks" />;

  const overdue = tasks.filter(t => t.status === 'overdue').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const done = tasks.filter(t => t.status === 'done').length;

  const stats = [
    { label: 'Total', value: tasks.length, color: 'hsl(var(--text-2))', icon: ClipboardText },
    { label: 'Overdue', value: overdue, color: 'hsl(var(--s-er-tx))', icon: Warning },
    { label: 'In Progress', value: inProgress, color: 'hsl(var(--brand))', icon: Clock },
    { label: 'Done This Week', value: done, color: 'hsl(var(--s-ok-tx))', icon: CheckCircle },
  ];

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)));
    }
  }

  function bulkChangeStatus(status: TaskStatus) {
    setTasks(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, status } : t));
    toast.success(`Updated ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''} to ${status.replace('_', ' ')}`);
    setSelectedIds(new Set());
  }

  function bulkChangePriority(priority: Severity) {
    setTasks(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, priority } : t));
    toast.success(`Changed priority for ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  }

  function handleDragStart(e: DragStartEvent) { setActiveId(String(e.active.id)); }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const taskId = String(active.id);
    const overId = String(over.id);
    if (KANBAN_COLUMNS.includes(overId as TaskStatus)) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: overId as TaskStatus } : t));
      toast.success(`Task moved to ${statusConfig[overId as TaskStatus].label}`);
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask && overTask.status !== tasks.find(t => t.id === taskId)?.status) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: overTask.status } : t));
        toast.success(`Task moved to ${statusConfig[overTask.status].label}`);
      }
    }
  }

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  function openAdd() {
    setForm(emptyForm);
    setEditTask(null);
    setShowAdd(true);
  }

  function openEdit(t: Task) {
    setForm({ ...t });
    setEditTask(t);
    setShowAdd(true);
  }

  function saveTask() {
    if (!form.title.trim()) return;
    if (editTask) {
      setTasks(prev => prev.map(t => t.id === editTask.id ? { ...editTask, ...form } : t));
    } else {
      const newId = `TSK-${String(tasks.length + 1).padStart(3, '0')}`;
      setTasks(prev => [{ id: newId, ...form } as Task, ...prev]);
    }
    setShowAdd(false);
  }

  function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Task Management"
        subtitle="Compliance and governance tasks derived from risks and gaps"
        breadcrumbs={[{ label: 'Home', href: '/overview' }, { label: 'Tasks' }]}
        actions={
          <>
            <div style={{ display: 'flex', border: '1px solid hsl(var(--border))' }}>
              <button
                onClick={() => setView('table')}
                style={{
                  padding: '6px 12px',
                  background: view === 'table' ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))',
                  color: view === 'table' ? 'hsl(var(--bg-surface))' : 'hsl(var(--text-2))',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12,
                }}
              >
                <Rows size={13} /> Table
              </button>
              <button
                onClick={() => setView('kanban')}
                style={{
                  padding: '6px 12px',
                  background: view === 'kanban' ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))',
                  color: view === 'kanban' ? 'hsl(var(--bg-surface))' : 'hsl(var(--text-2))',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12,
                }}
              >
                <Kanban size={13} /> Kanban
              </button>
            </div>
            <button
              onClick={openAdd}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px',
                background: 'hsl(var(--brand))',
                color: 'hsl(var(--bg-surface))',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Plus size={14} /> Add Task
            </button>
          </>
        }
      />

      {/* Overdue banner */}
      {overdue > 0 && (
        <div style={{
          background: 'hsl(var(--s-er-bg))',
          border: '1px solid hsl(var(--s-er-br))',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Warning size={16} style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--s-er-tx))' }}>
            {overdue} overdue task{overdue > 1 ? 's' : ''} require immediate attention
          </span>
          <button
            onClick={() => setFilterStatus('overdue')}
            style={{ marginLeft: 'auto', fontSize: 12, color: 'hsl(var(--s-er-tx))', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            View Overdue Tasks
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</span>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <MagnifyingGlass size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-3))' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            style={{
              width: '100%',
              padding: '7px 10px 7px 28px',
              background: 'hsl(var(--bg-surface))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--text-1))',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '7px 10px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', fontSize: 13 }}
        >
          <option value="all">All Status</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          style={{ padding: '7px 10px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', fontSize: 13 }}
        >
          <option value="all">All Priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {(filterStatus !== 'all' || filterPriority !== 'all' || search) && (
          <button
            onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setSearch(''); }}
            style={{ padding: '7px 10px', background: 'none', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-3))', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table view */}
      {view === 'table' && (
        <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'hsl(var(--bg-raised))' }}>
                {['ID', 'Title', 'Priority', 'Status', 'Assignee', 'Due Date', 'Source', 'Actions'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left',
                    padding: '10px 14px',
                    fontWeight: 600,
                    fontSize: 11,
                    color: 'hsl(var(--text-3))',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    borderBottom: '1px solid hsl(var(--border))',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <EmptyState
                      icon={<ClipboardText size={32} weight="duotone" />}
                      title="No tasks found"
                      description="Try adjusting your filters or search terms."
                      action={
                        <button onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setSearch(''); }} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', cursor: 'pointer', fontSize: 12 }}>
                          Clear Filters
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((t, i) => (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                      background: t.status === 'overdue' ? 'hsl(var(--s-er-bg)/20%)' : 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={() => setDetailTask(t)}
                  >
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: 'hsl(var(--text-3))' }}>{t.id}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500, color: 'hsl(var(--text-1))', maxWidth: 280 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.title}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusBadge status={t.status} />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AvatarInitials name={t.assignee} />
                        <span style={{ color: 'hsl(var(--text-2))', fontSize: 12 }}>{(t.assignee ?? '').split(' ')[0] || '–'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: t.status === 'overdue' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-2))' }}>
                        <CalendarBlank size={12} />
                        <span style={{ fontSize: 12 }}>{formatDate(t.dueDate)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10, fontFamily: 'monospace' }}>
                        {t.source}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openEdit(t)}
                          style={{ background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-3))', padding: '3px 6px' }}
                          title="Edit"
                        >
                          <PencilSimple size={13} />
                        </button>
                        <button
                          onClick={() => deleteTask(t.id)}
                          style={{ background: 'none', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--s-er-tx))', padding: '3px 6px' }}
                          title="Delete"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div style={{ padding: '10px 14px', borderTop: '1px solid hsl(var(--border))', fontSize: 12, color: 'hsl(var(--text-4))' }}>
            {filtered.length} of {tasks.length} tasks
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'hsl(var(--brand)/0.08)', border: '1px solid hsl(var(--brand)/0.3)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--brand))' }}>
            {selectedIds.size} selected
          </span>
          <select
            onChange={e => { if (e.target.value) { bulkChangeStatus(e.target.value as TaskStatus); e.target.value = ''; } }}
            style={{ padding: '5px 10px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', fontSize: 12, cursor: 'pointer' }}
          >
            <option value="">Change Status ({selectedIds.size})</option>
            {(Object.keys(statusConfig) as TaskStatus[]).map(s => (
              <option key={s} value={s}>{statusConfig[s].label}</option>
            ))}
          </select>
          <select
            onChange={e => { if (e.target.value) { bulkChangePriority(e.target.value as Severity); e.target.value = ''; } }}
            style={{ padding: '5px 10px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', fontSize: 12, cursor: 'pointer' }}
          >
            <option value="">Change Priority ({selectedIds.size})</option>
            {(['critical', 'high', 'medium', 'low'] as Severity[]).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
          >
            <X size={14} /> Clear
          </button>
        </div>
      )}

      {/* Kanban view — DnD enabled */}
      {view === 'kanban' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${KANBAN_COLUMNS.length}, 1fr)`, gap: 12, overflowX: 'auto' }}>
            {KANBAN_COLUMNS.map(status => {
              const sc = statusConfig[status];
              const colTasks = tasks.filter(t => t.status === status && (
                !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase())
              ) && (filterPriority === 'all' || t.priority === filterPriority));
              return (
                <div
                  key={status}
                  id={status}
                  style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', padding: 10, minHeight: 400, minWidth: 200 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid hsl(var(--border))' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc.text, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-2))' }}>
                      {sc.label}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '1px 6px', background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                      {colTasks.length}
                    </span>
                  </div>
                  <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {colTasks.map(t => (
                        <SortableCard
                          key={t.id}
                          task={t}
                          selected={selectedIds.has(t.id)}
                          onSelect={toggleSelect}
                          onClick={setDetailTask}
                        />
                      ))}
                      {colTasks.length === 0 && (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: 'hsl(var(--text-4))', fontSize: 11, border: '1px dashed hsl(var(--border))' }}>
                          Drop here
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
          <DragOverlay>
            {activeId ? (() => {
              const task = tasks.find(t => t.id === activeId);
              if (!task) return null;
              return (
                <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--brand))', padding: 10, opacity: 0.9, boxShadow: 'var(--shadow-lg)' }}>
                  <p style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--text-1))' }}>{task.title.slice(0, 50)}…</p>
                </div>
              );
            })() : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Task detail drawer */}
      {detailTask && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ flex: 1, background: 'hsl(var(--bg-page)/60%)', backdropFilter: 'blur(4px)' }} onClick={() => setDetailTask(null)} />
          <div style={{ width: 480, background: 'hsl(var(--bg-surface))', borderLeft: '1px solid hsl(var(--border))', overflowY: 'auto' }}>
            {/* Drawer header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'hsl(var(--bg-surface))', zIndex: 10 }}>
              <div>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'hsl(var(--text-3))' }}>{detailTask.id}</span>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <PriorityBadge priority={detailTask.priority} />
                  <StatusBadge status={detailTask.status} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { openEdit(detailTask); setDetailTask(null); }} style={{ padding: '5px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <PencilSimple size={12} /> Edit
                </button>
                <button onClick={() => setDetailTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer content */}
            <div style={{ padding: '20px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--text-1))', marginBottom: 8, lineHeight: 1.4 }}>{detailTask.title}</h2>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', lineHeight: 1.6, marginBottom: 20 }}>{detailTask.description}</p>

              {/* Meta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
                {[
                  { label: 'Assignee', value: detailTask.assignee },
                  { label: 'Due Date', value: formatDate(detailTask.dueDate) },
                  { label: 'Source', value: `${detailTask.source} (${detailTask.sourceType})` },
                  { label: 'Priority', value: detailTask.priority },
                  { label: 'Status', value: detailTask.status.replace('_', ' ') },
                ].map((r, i, arr) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{r.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-1))' }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Mock comments */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-3))', marginBottom: 12 }}>Comments</p>
                {[
                  { author: 'Sarah Chen', time: '2026-03-30', comment: 'Prioritized this for Q2. Please update status when remediation steps are confirmed.' },
                  { author: detailTask.assignee, time: '2026-03-31', comment: 'Acknowledged. Working on the technical implementation. ETA end of next sprint.' },
                ].map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <AvatarInitials name={c.author} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{c.author}</span>
                        <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{formatDate(c.time)}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', lineHeight: 1.5 }}>{c.comment}</p>
                    </div>
                  </div>
                ))}

                {/* Comment input */}
                <div style={{ marginTop: 12 }}>
                  <textarea
                    placeholder="Add a comment…"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'hsl(var(--bg-muted))',
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--text-1))',
                      fontSize: 12,
                      resize: 'vertical',
                      outline: 'none',
                    }}
                  />
                  <button style={{ marginTop: 6, padding: '6px 14px', background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                    Add Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'hsl(var(--bg-page)/60%)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'hsl(var(--text-1))', fontSize: 15 }}>
                {editTask ? 'Edit Task' : 'Create Task'}
              </span>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }} />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                  style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Priority */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Severity })}
                    style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }}>
                    {(['critical', 'high', 'medium', 'low'] as Severity[]).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })}
                    style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }}>
                    {(['todo', 'in_progress', 'done', 'overdue'] as TaskStatus[]).map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assignee</label>
                  <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }}>
                    <option value="">Select…</option>
                    {USERS.map(u => <option key={u.id} value={u.name}>{u.name} — {u.role}</option>)}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }} />
                </div>
              </div>

              {/* Source */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Source ID (e.g. GAP-001)</label>
                <input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }} />
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-sunken))', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid hsl(var(--border-mid))', color: 'hsl(var(--text-2))', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={saveTask} style={{ padding: '6px 16px', background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                {editTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
