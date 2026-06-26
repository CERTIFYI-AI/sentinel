// @ts-nocheck
import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import {
  X, PencilSimple, CalendarBlank, User, Flag, Link as LinkIcon,
  Activity, ChatText, ArrowRight, Check,
} from '@phosphor-icons/react';
import { TASK_STATUS_CONFIG, type Task, type TaskStatus } from './taskData';
import { severityColor, formatDate, USERS } from '../../data/seed';
import type { Severity } from '../../data/seed';
import { useEffect } from 'react'
import { useTasks } from '../../hooks/queries/useTasks'

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

// ── helpers ────────────────────────────────────────────────────────────────

function AvatarInitials({ name, size = 28 }: { name?: string | null; size?: number }) {
  const safeName = name ?? '';
  const initials = safeName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const colors = ['#6366f1', '#f97316', '#10b981', '#06b6d4', '#a855f7', '#f59e0b'];
  const idx = safeName.charCodeAt(0) % colors.length;
  return (
    <div title={safeName} style={{
      width: size, height: size, borderRadius: '50%',
      background: colors[idx],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {initials}
    </div>
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

function StatusBadge({ status }: { status: TaskStatus }) {
  const c = TASK_STATUS_CONFIG[status];
  return (
    <Badge style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 0, fontSize: 10 }}>
      {c.label}
    </Badge>
  );
}

interface Comment {
  id: string;
  author: string;
  timestamp: string;
  text: string;
}

// MOCK_ACTIVITY kept for reference - Supabase tasks loaded below
const MOCK_ACTIVITY = [
  { time: '2026-03-29T09:00:00Z', action: 'Task created from risk assessment', actor: 'System' },
  { time: '2026-03-29T09:05:00Z', action: 'Assigned to owner', actor: 'System' },
  { time: '2026-03-30T11:30:00Z', action: 'Priority updated to current level', actor: 'Sarah Chen' },
  { time: '2026-03-31T14:00:00Z', action: 'Status changed to In Progress', actor: 'Assignee' },
  { time: '2026-04-01T09:15:00Z', action: 'Due date confirmed', actor: 'Assignee' },
];

// ── component ──────────────────────────────────────────────────────────────

interface TaskDrawerProps {
  task: Task;
  onClose: () => void;
  onSave?: (task: Task) => void;
}

export default function TaskDrawer({ task, onClose, onSave }: TaskDrawerProps) {
  const [editing, setEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task>({ ...task });
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 'CMT-001',
      author: 'Sarah Chen',
      timestamp: '2026-03-30T10:00:00Z',
      text: 'Prioritized for Q2 remediation sprint. Please confirm scope and update status when implementation begins.',
    },
    {
      id: 'CMT-002',
      author: task.assignee,
      timestamp: '2026-03-31T14:30:00Z',
      text: 'Acknowledged. Started technical scoping. Will provide implementation estimate by end of week.',
    },
  ]);
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');

  function submitComment() {
    if (!commentText.trim()) return;
    setComments(prev => [...prev, {
      id: `CMT-${String(prev.length + 1).padStart(3, '0')}`,
      author: 'You',
      timestamp: new Date().toISOString(),
      text: commentText.trim(),
    }]);
    setCommentText('');
  }

  function saveEdit() {
    onSave?.(editedTask);
    setEditing(false);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
      }}
    >
      {/* Overlay */}
      <div
        style={{ flex: 1, background: 'hsl(var(--bg-page)/60%)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div style={{
        width: 520,
        background: 'hsl(var(--bg-surface))',
        borderLeft: '1px solid hsl(var(--border))',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100vh',
        overflowY: 'auto',
              }}>
        {/* Sticky header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          padding: '14px 20px',
          borderBottom: '1px solid hsl(var(--border))',
          background: 'hsl(var(--bg-surface))',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-3))' }}>{task.id}</span>
          <PriorityBadge priority={editing ? editedTask.priority : task.priority} />
          <StatusBadge status={editing ? editedTask.status : task.status} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {editing ? (
              <>
                <button
                  onClick={saveEdit}
                  style={{ padding: '5px 12px', background: 'hsl(var(--brand))', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Check size={13} /> Save
                </button>
                <button
                  onClick={() => { setEditedTask({ ...task }); setEditing(false); }}
                  style={{ padding: '5px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 12 }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                style={{ padding: '5px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <PencilSimple size={12} /> Edit
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: 20 }}>
          {/* Title */}
          {editing ? (
            <input
              value={editedTask.title}
              onChange={e => setEditedTask(t => ({ ...t, title: e.target.value }))}
              style={{
                width: '100%', fontSize: 16, fontWeight: 700,
                color: 'hsl(var(--text-1))', background: 'hsl(var(--bg-raised))',
                border: '1px solid hsl(var(--border))', padding: '6px 10px',
                marginBottom: 12,
              }}
            />
          ) : (
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--text-1))', marginBottom: 10, lineHeight: 1.4 }}>
              {task.title}
            </h2>
          )}

          {/* Description */}
          {editing ? (
            <textarea
              value={editedTask.description}
              onChange={e => setEditedTask(t => ({ ...t, description: e.target.value }))}
              rows={3}
              style={{
                width: '100%', fontSize: 13, color: 'hsl(var(--text-2))',
                background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))',
                padding: '6px 10px', resize: 'vertical', lineHeight: 1.5, marginBottom: 16,
              }}
            />
          ) : (
            <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', lineHeight: 1.6, marginBottom: 16 }}>
              {task.description}
            </p>
          )}

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))', marginBottom: 16 }}>
            {(['details', 'activity'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  fontSize: 12, fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: activeTab === tab ? '2px solid hsl(var(--brand))' : '2px solid transparent',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'details' && (
            <>
              {/* Meta fields */}
              <div style={{ marginBottom: 20 }}>
                {[
                  {
                    label: 'Assignee',
                    icon: User,
                    content: editing ? (
                      <select
                        value={editedTask.assignee}
                        onChange={e => setEditedTask(t => ({ ...t, assignee: e.target.value }))}
                        style={{ padding: '4px 8px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 12 }}
                      >
                        {USERS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AvatarInitials name={task.assignee} size={22} />
                        <span style={{ fontSize: 13, color: 'hsl(var(--text-1))' }}>{task.assignee}</span>
                      </div>
                    ),
                  },
                  {
                    label: 'Due Date',
                    icon: CalendarBlank,
                    content: editing ? (
                      <input type="date" value={editedTask.dueDate}
                        onChange={e => setEditedTask(t => ({ ...t, dueDate: e.target.value }))}
                        style={{ padding: '4px 8px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 12 }}
                      />
                    ) : (
                      <span style={{ fontSize: 13, color: task.status === 'overdue' ? '#ef4444' : 'hsl(var(--text-1))' }}>
                        {formatDate(task.dueDate)}
                      </span>
                    ),
                  },
                  {
                    label: 'Priority',
                    icon: Flag,
                    content: editing ? (
                      <select value={editedTask.priority}
                        onChange={e => setEditedTask(t => ({ ...t, priority: e.target.value as Severity }))}
                        style={{ padding: '4px 8px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 12 }}
                      >
                        {(['critical', 'high', 'medium', 'low'] as Severity[]).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <PriorityBadge priority={task.priority} />
                    ),
                  },
                  {
                    label: 'Status',
                    icon: Check,
                    content: editing ? (
                      <select value={editedTask.status}
                        onChange={e => setEditedTask(t => ({ ...t, status: e.target.value as TaskStatus }))}
                        style={{ padding: '4px 8px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 12 }}
                      >
                        {(['todo', 'in_progress', 'done', 'overdue'] as TaskStatus[]).map(s => (
                          <option key={s} value={s}>{TASK_STATUS_CONFIG[s].label}</option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge status={task.status} />
                    ),
                  },
                  {
                    label: 'Linked Risk/Gap',
                    icon: LinkIcon,
                    content: (
                      <a href={task.sourceLink} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'hsl(var(--brand))', textDecoration: 'none', fontFamily: 'monospace' }}>
                        {task.source} <ArrowRight size={11} />
                      </a>
                    ),
                  },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                  }}>
                    <div style={{ width: 120, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <row.icon size={13} style={{ color: 'hsl(var(--text-3))' }} />
                      <span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{row.label}</span>
                    </div>
                    <div>{row.content}</div>
                  </div>
                ))}
              </div>

              {/* Comments */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-3))', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ChatText size={13} /> Comments ({comments.length})
                </p>

                <div style={{ marginBottom: 16 }}>
                  {comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                      <AvatarInitials name={c.author} size={28} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{c.author}</span>
                          <span style={{ fontSize: 11, color: 'hsl(var(--text-4))', fontFamily: 'monospace' }}>
                            {new Date(c.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', lineHeight: 1.5, padding: '8px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                          {c.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* New comment input */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AvatarInitials name="You" size={28} />
                  <div style={{ flex: 1 }}>
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Add a comment…"
                      rows={2}
                      style={{
                        width: '100%', padding: '8px 10px',
                        background: 'hsl(var(--bg-muted))',
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--text-1))',
                        fontSize: 12, resize: 'vertical', outline: 'none', marginBottom: 6,
                      }}
                    />
                    <button
                      onClick={submitComment}
                      disabled={!commentText.trim()}
                      style={{
                        padding: '5px 14px',
                        background: commentText.trim() ? 'hsl(var(--brand))' : 'hsl(var(--bg-muted))',
                        color: commentText.trim() ? '#fff' : 'hsl(var(--text-4))',
                        border: 'none', cursor: commentText.trim() ? 'pointer' : 'default',
                        fontSize: 12, fontWeight: 500,
                      }}
                    >
                      Add Comment
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'activity' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Activity size={13} style={{ color: 'hsl(var(--brand))' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))' }}>Activity Log</span>
              </div>
              <div>
                {MOCK_ACTIVITY.map((a, i, arr) => (
                  <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < arr.length - 1 ? 14 : 0, marginBottom: i < arr.length - 1 ? 0 : 0, position: 'relative' }}>
                    {/* Vertical line */}
                    {i < arr.length - 1 && (
                      <div style={{ position: 'absolute', left: 6, top: 14, bottom: 0, width: 1, background: 'hsl(var(--border))' }} />
                    )}
                    {/* Dot */}
                    <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'hsl(var(--bg-muted))', border: '2px solid hsl(var(--brand))', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ flex: 1, paddingBottom: 14, borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                      <p style={{ fontSize: 12, color: 'hsl(var(--text-1))', marginBottom: 2 }}>{a.action}</p>
                      <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'hsl(var(--text-4))' }}>
                        <span>{a.actor}</span>
                        <span>·</span>
                        <span style={{ fontFamily: 'monospace' }}>
                          {new Date(a.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
