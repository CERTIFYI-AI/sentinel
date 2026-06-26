import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import {
  CalendarBlank, Warning, CheckCircle, Clock, Kanban, Plus, X,
} from '@phosphor-icons/react';
import { TASKS, TASK_STATUS_CONFIG, type Task, type TaskStatus } from './taskData';
import { severityColor, formatDate } from '../../data/seed';
import type { Severity } from '../../data/seed';

function AvatarInitials({ name }: { name?: string | null }) {
  const safeName = name ?? '';
  const initials = safeName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const colors = ['#6366f1', '#f97316', '#10b981', '#06b6d4', '#a855f7', '#f59e0b'];
  const idx = safeName.charCodeAt(0) % colors.length;
  return (
    <div title={safeName} style={{
      width: 22, height: 22, borderRadius: '50%',
      background: colors[idx],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Severity }) {
  const c = severityColor(priority);
  return (
    <Badge style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 0, fontSize: 9 }}>
      {priority}
    </Badge>
  );
}

const COLUMN_ORDER: TaskStatus[] = ['todo', 'in_progress', 'overdue', 'done'];

export default function TaskBoard({ onSelectTask }: { onSelectTask?: (task: Task) => void }) {
  const [tasks] = useState<Task[]>(TASKS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleSelect = (task: Task) => {
    setSelectedTask(task);
    onSelectTask?.(task);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Kanban size={18} style={{ color: 'hsl(var(--brand))' }} />
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0 }}>Task Board</h2>
        <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10 }}>
          {tasks.length} tasks
        </Badge>
      </div>

      {/* Kanban columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {COLUMN_ORDER.map(status => {
          const sc = TASK_STATUS_CONFIG[status];
          const colTasks = tasks.filter(t => t.status === status);
          const icons: Record<TaskStatus, React.ComponentType<any>> = {
            done: CheckCircle,
            overdue: Warning,
            in_progress: Clock,
            todo: Plus,
          };
          const IconComp = icons[status];

          return (
            <div key={status} style={{
              background: 'hsl(var(--bg-muted))',
              border: '1px solid hsl(var(--border))',
              padding: 12,
              minHeight: 400,
            }}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 12, paddingBottom: 10,
                borderBottom: '1px solid hsl(var(--border))',
              }}>
                <IconComp size={13} style={{ color: sc.text, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-2))' }}>
                  {sc.label}
                </span>
                <Badge style={{
                  marginLeft: 'auto',
                  background: sc.bg,
                  color: sc.text,
                  border: `1px solid ${sc.border}`,
                  borderRadius: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 20,
                  textAlign: 'center',
                }}>
                  {colTasks.length}
                </Badge>
              </div>

              {/* Task cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => handleSelect(task)}
                    style={{
                      background: 'hsl(var(--bg-surface))',
                      border: `1px solid ${selectedTask?.id === task.id ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    {/* Left accent stripe */}
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                      background: task.status === 'overdue' ? '#ef4444'
                        : task.status === 'done' ? '#10b981'
                        : task.status === 'in_progress' ? 'hsl(var(--brand))'
                        : 'hsl(var(--border))',
                    }} />

                    {/* Priority + ID */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <PriorityBadge priority={task.priority} />
                      <span style={{ marginLeft: 'auto', fontSize: 9, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>
                        {task.id}
                      </span>
                    </div>

                    {/* Title */}
                    <p style={{
                      fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-1))',
                      lineHeight: 1.4, marginBottom: 8,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {task.title}
                    </p>

                    {/* Source */}
                    <Badge style={{
                      background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))',
                      border: '1px solid hsl(var(--border))', borderRadius: 0,
                      fontSize: 9, fontFamily: 'monospace', marginBottom: 8,
                    }}>
                      {task.source}
                    </Badge>

                    {/* Bottom: avatar + due date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AvatarInitials name={task.assignee} />
                      <span style={{ fontSize: 11, color: 'hsl(var(--text-3))', flex: 1 }}>
                        {(task.assignee ?? '').split(' ')[0] || '–'}
                      </span>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        fontSize: 10,
                        color: task.status === 'overdue' ? '#ef4444' : 'hsl(var(--text-4))',
                      }}>
                        <CalendarBlank size={10} />
                        {formatDate(task.dueDate)}
                      </div>
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div style={{
                    padding: '24px 0', textAlign: 'center', color: 'hsl(var(--text-4))',
                    fontSize: 12, border: '1px dashed hsl(var(--border))',
                  }}>
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected task detail */}
      {selectedTask && (
        <div style={{
          marginTop: 20,
          background: 'hsl(var(--bg-surface))',
          border: '1px solid hsl(var(--border))',
          padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-3))' }}>{selectedTask.id}</span>
              <PriorityBadge priority={selectedTask.priority} />
              <Badge style={{
                background: TASK_STATUS_CONFIG[selectedTask.status].bg,
                color: TASK_STATUS_CONFIG[selectedTask.status].text,
                border: `1px solid ${TASK_STATUS_CONFIG[selectedTask.status].border}`,
                borderRadius: 0, fontSize: 10,
              }}>
                {TASK_STATUS_CONFIG[selectedTask.status].label}
              </Badge>
            </div>
            <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}>
              <X size={16} />
            </button>
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--text-1))', marginBottom: 6 }}>{selectedTask.title}</h3>
          <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', lineHeight: 1.5, marginBottom: 10 }}>{selectedTask.description}</p>
          <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'hsl(var(--text-3))' }}>
            <span>Assignee: <strong style={{ color: 'hsl(var(--text-2))' }}>{selectedTask.assignee}</strong></span>
            <span>Due: <strong style={{ color: 'hsl(var(--text-2))' }}>{formatDate(selectedTask.dueDate)}</strong></span>
            <span>Source: <strong style={{ color: 'hsl(var(--text-2))', fontFamily: 'monospace' }}>{selectedTask.source}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
