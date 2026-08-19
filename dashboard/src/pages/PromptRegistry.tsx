import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { usePromptRegistryData } from '@/hooks/usePromptRegistryData';
import { useModelOptions, type ModelOption } from '@/hooks/useAiiaData';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import {
  ChatTeardropText, Plus, MagnifyingGlass, PencilSimple, Trash,
  Eye, ClockCounterClockwise, Tag, Robot, CheckCircle,
  Warning, Clock, Archive, Funnel, ArrowsClockwise,
  ShieldCheck, Scales, Lock, Sparkle, Copy, LinkSimple, ArrowSquareOut,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {

  type PromptRecord, type PromptStatus, type PromptCategory, formatDate,
} from '../data/seed';

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

function statusConfig(s: PromptStatus) {
  const map: Record<PromptStatus, { label: string; bg: string; color: string; icon: ReactNode }> = {
    active:       { label: 'Active',       bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', icon: <CheckCircle size={11} weight="fill" /> },
    draft:        { label: 'Draft',        bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', icon: <Clock size={11} weight="fill" /> },
    deprecated:   { label: 'Deprecated',   bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', icon: <Archive size={11} weight="fill" /> },
    under_review: { label: 'Under Review', bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', icon: <Warning size={11} weight="fill" /> },
  };
  return map[s] ?? map.draft;
}

function categoryLabel(c: PromptCategory): string {
  const map: Record<PromptCategory, string> = {
    system: 'System', user: 'User', tool_call: 'Tool Call',
    safety: 'Safety', chain_of_thought: 'Chain of Thought',
  };
  return map[c] ?? c;
}

function bumpVersion(v: string): string {
  const clean = v.replace(/-rc\d+$/, '');
  const parts = clean.split('.').map(Number);
  parts[2] = (parts[2] ?? 0) + 1;
  return parts.join('.');
}

function generateId(): string {
  // Collision-free id. The previous PR-NNN max()+1 scheme could reissue an id
  // after deletes or across concurrent clients, silently overwriting a prompt.
  return `PR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

// ── Toaster ───────────────────────────────────────────────────────────────────
function Toaster({ toasts, remove }: { toasts: ToastMsg[]; remove: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-4 py-3 border shadow-lg text-sm font-medium min-w-[280px]"
          style={{
            background: 'hsl(var(--bg-surface))',
            borderColor: t.type === 'error' ? 'hsl(var(--s-er-br))' : t.type === 'info' ? 'hsl(var(--s-in-br))' : 'hsl(var(--s-ok-br))',
            color: t.type === 'error' ? 'hsl(var(--s-er-tx))' : t.type === 'info' ? 'hsl(var(--s-in-tx))' : 'hsl(var(--s-ok-tx))',
          }}>
          <span className="flex-1">{t.text}</span>
          <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100"><Trash size={12} /></button>
        </div>
      ))}
    </div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function StatsRow({ records }: { records: PromptRecord[] }) {
  const stats = [
    { label: 'Total Prompts', value: records.length, color: 'hsl(var(--brand))', icon: <ChatTeardropText size={14} /> },
    { label: 'Active', value: records.filter(r => r.status === 'active').length, color: 'hsl(var(--s-ok-tx))', icon: <CheckCircle size={14} /> },
    { label: 'Under Review', value: records.filter(r => r.status === 'under_review').length, color: 'hsl(var(--s-wn-tx))', icon: <Warning size={14} /> },
    { label: 'Draft', value: records.filter(r => r.status === 'draft').length, color: 'hsl(var(--text-3))', icon: <Clock size={14} /> },
    { label: 'Deprecated', value: records.filter(r => r.status === 'deprecated').length, color: 'hsl(var(--s-er-tx))', icon: <Archive size={14} /> },
    { label: 'Avg Tokens', value: Math.round(records.reduce((a, r) => a + r.tokenCount, 0) / Math.max(records.length, 1)), color: 'hsl(var(--text-2))', icon: <Tag size={14} /> },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
      {stats.map(s => (
        <div key={s.label} style={{ padding: '12px 14px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ color: s.color }}>{s.icon}</span>
            <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', margin: 0 }}>{s.label}</p>
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Prompt Card ───────────────────────────────────────────────────────────────
function PromptCard({ record, onView, onEdit, onDelete, models, navigate }: {
  record: PromptRecord;
  onView: (r: PromptRecord) => void;
  onEdit: (r: PromptRecord) => void;
  onDelete: (r: PromptRecord) => void;
  models: ModelOption[];
  navigate: (path: string) => void;
}) {
  const sc = statusConfig(record.status);
  const linkedIds = record.usedByModelIds ?? [];
  return (
    <Card className="bg-surface border-[hsl(var(--border))] hover:border-[hsl(var(--brand))] transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-[hsl(var(--text-4))]">{record.id}</span>
              <Badge style={{ background: sc.bg, color: sc.color, borderRadius: 0, fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                {sc.icon}{sc.label}
              </Badge>
              <Badge style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10 }}>
                {categoryLabel(record.category)}
              </Badge>
            </div>
            <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] truncate">{record.name}</h3>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="View" onClick={() => onView(record)}><Eye size={13} /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => onEdit(record)}><PencilSimple size={13} /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-[hsl(var(--destructive))]" title="Delete" onClick={() => onDelete(record)}><Trash size={13} /></Button>
          </div>
        </div>

        <p className="text-xs text-[hsl(var(--text-3))] line-clamp-2 mb-3">{record.description}</p>

        <pre className="text-xs font-mono bg-raised border border-[hsl(var(--border))] p-2 line-clamp-3 text-[hsl(var(--text-3))] mb-3 whitespace-pre-wrap leading-relaxed overflow-hidden">
          {record.content.slice(0, 180)}{record.content.length > 180 ? '…' : ''}
        </pre>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-[10px] text-[hsl(var(--text-4))]">
            <span className="flex items-center gap-1"><Robot size={10} />{record.model}</span>
            <span className="flex items-center gap-1"><ClockCounterClockwise size={10} />v{record.currentVersion}</span>
            <span className="flex items-center gap-1"><Tag size={10} />{record.tokenCount} tok</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {record.tags.slice(0, 3).map(t => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]">{t}</span>
            ))}
            {record.tags.length > 3 && (
              <span className="text-[9px] px-1.5 py-0.5 bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-4))]">+{record.tags.length - 3}</span>
            )}
          </div>
        </div>

        {linkedIds.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[hsl(var(--border))]">
            <div className="flex items-center gap-1 mb-1.5 text-[9px] uppercase tracking-wide font-semibold text-[hsl(var(--text-4))]">
              <LinkSimple size={10} />Used by governed models
            </div>
            <div className="flex flex-wrap gap-1">
              {linkedIds.map(id => {
                const m = models.find(mm => mm.id === id);
                if (!m) {
                  return (
                    <span key={id} title="Linked model is not in the registry"
                      className="text-[10px] px-1.5 py-0.5 flex items-center gap-1"
                      style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))' }}>
                      <Warning size={9} weight="fill" />Unavailable
                    </span>
                  );
                }
                return (
                  <button key={id} title={`Open ${m.name}`}
                    onClick={e => { e.stopPropagation(); navigate(`/models/${id}`); }}
                    className="text-[10px] px-1.5 py-0.5 flex items-center gap-1 border border-transparent hover:border-[hsl(var(--brand))] transition-colors"
                    style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>
                    <Robot size={9} weight="fill" />{m.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-[hsl(var(--border))] text-[10px] flex items-center gap-1">
          {record.approvedBy ? (
            <span className="flex items-center gap-1 text-[hsl(var(--s-ok-tx))]">
              <CheckCircle size={10} />Approved by {record.approvedBy} · {formatDate(record.approvalDate!)}
            </span>
          ) : record.status !== 'deprecated' ? (
            <span className="flex items-center gap-1 text-[hsl(var(--s-wn-tx))]">
              <Warning size={10} />Pending approval · modified {formatDate(record.lastModified)}
            </span>
          ) : (
            <span className="text-[hsl(var(--text-4))]">Deprecated · {formatDate(record.lastModified)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Token Budget Bar ──────────────────────────────────────────────────────────
function TokenBudgetBar({ count, max = 4096 }: { count: number; max?: number }) {
  const pct = Math.min(count / max * 100, 100);
  const color = pct > 85 ? 'hsl(var(--s-er-tx))' : pct > 60 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Token Budget</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{count} / {max.toLocaleString()} ({pct.toFixed(0)}%)</span>
      </div>
      <div style={{ height: 6, background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.4s ease' }} />
      </div>
      {pct > 85 && (
        <p style={{ fontSize: 10, color: 'hsl(var(--s-er-tx))', marginTop: 3 }}>
          ⚠ Token usage exceeds 85% — consider splitting into sub-prompts.
        </p>
      )}
    </div>
  );
}

// ── Governed-model interlink ────────────────────────────────────────────────────
// Renders a prompt's usedByModelIds as pill-style links to /models/:id, resolving
// each id to its governed-model name (never a raw uuid). Unresolvable ids render
// as a non-clickable "Unavailable" pill.
function UsedByModelsLinks({ modelIds, models, navigate }: {
  modelIds: string[];
  models: ModelOption[];
  navigate: (path: string) => void;
}) {
  if (!modelIds.length) {
    return (
      <p style={{ fontSize: 12, color: 'hsl(var(--text-4))', margin: 0 }}>
        No governed models are linked to this prompt yet.
      </p>
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {modelIds.map(id => {
        const model = models.find(m => m.id === id);
        if (!model) {
          return (
            <span key={id} title="Linked model is not in the registry"
              style={{ fontSize: 12, padding: '4px 10px', background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', color: 'hsl(var(--s-er-tx))', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Warning size={11} weight="fill" />Unavailable
            </span>
          );
        }
        return (
          <button key={id} onClick={() => navigate(`/models/${id}`)} title={`Open ${model.name}`}
            className="group/link"
            style={{ fontSize: 12, padding: '4px 10px', background: 'hsl(var(--brand-subtle))', border: '1px solid hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'filter 0.15s ease, border-color 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(var(--brand))'; e.currentTarget.style.filter = 'brightness(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--brand-subtle))'; e.currentTarget.style.filter = 'none'; }}
          >
            <Robot size={11} weight="fill" />
            <span style={{ fontWeight: 600 }}>{model.name}</span>
            {model.riskTier && (
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', opacity: 0.75 }}>· {model.riskTier}</span>
            )}
            <ArrowSquareOut size={10} />
          </button>
        );
      })}
    </div>
  );
}

// ── View Sheet ────────────────────────────────────────────────────────────────
function ViewSheet({ record, open, onClose, onAction, models, navigate }: {
  record: PromptRecord | null; open: boolean; onClose: () => void;
  onAction: (record: PromptRecord, action: 'approve' | 'reject' | 'submit') => void;
  models: ModelOption[];
  navigate: (path: string) => void;
}) {
  const [tab, setTab] = useState<'content' | 'test' | 'safety' | 'versions' | 'meta'>('content');
  const [vars, setVars] = useState<Record<string, string>>({});
  if (!record) return null;
  const sc = statusConfig(record.status);

  // Heuristic (static) pre-screen derived from the prompt text/category — a
  // lightweight indicator, not a substitute for a live safety classifier.
  const safetyAnalysis = {
    injectionRisk: record.category === 'user' ? 'HIGH' : record.category === 'tool_call' ? 'MEDIUM' : 'LOW',
    piiDetected: record.content.toLowerCase().includes('name') || record.content.toLowerCase().includes('email'),
    toxicityScore: record.category === 'safety' ? 2 : 8,
    jailbreakResistance: record.category === 'safety' ? 'HIGH' : record.tags.includes('guardrail') ? 'HIGH' : 'MEDIUM',
    dataExfil: record.content.toLowerCase().includes('system') ? 'LOW' : 'NONE',
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-[660px] max-w-full flex flex-col overflow-hidden p-0"
        style={{ background: 'hsl(var(--bg-surface))' }}>
        <SheetHeader style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', flexShrink: 0, background: 'hsl(var(--bg-raised))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-4))', background: 'hsl(var(--bg-muted))', padding: '2px 6px' }}>{record.id}</span>
            <Badge style={{ background: sc.bg, color: sc.color, borderRadius: 0, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>{sc.icon}{sc.label}</Badge>
            <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10, fontFamily: 'monospace' }}>v{record.currentVersion}</Badge>
            <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10 }}>{categoryLabel(record.category)}</Badge>
          </div>
          <SheetTitle style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0 }}>{record.name}</SheetTitle>
          <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', marginTop: 4, marginBottom: 10 }}>{record.description}</p>
          <TokenBudgetBar count={record.tokenCount} />

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {record.status === 'under_review' && (
              <>
                <button
                  onClick={() => onAction(record, 'approve')}
                  style={{ padding: '6px 12px', background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'hsl(var(--s-ok-tx))' }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => onAction(record, 'reject')}
                  style={{ padding: '6px 12px', background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'hsl(var(--s-er-tx))' }}
                >
                  ✗ Reject
                </button>
              </>
            )}
            {record.status === 'draft' && (
              <button
                onClick={() => onAction(record, 'submit')}
                style={{ padding: '6px 12px', background: 'hsl(var(--s-wn-bg))', border: '1px solid hsl(var(--s-wn-br))', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'hsl(var(--s-wn-tx))' }}
              >
                Submit for Review
              </button>
            )}
          </div>
        </SheetHeader>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))', flexShrink: 0, background: 'hsl(var(--bg-raised))' }}>
          {(['content', 'test', 'safety', 'versions', 'meta'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '10px 14px', fontSize: 11, fontWeight: tab === t ? 600 : 400, cursor: 'pointer',
                color: tab === t ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
                borderBottom: tab === t ? '2px solid hsl(var(--brand))' : '2px solid transparent',
                background: 'none', border: 'none', textTransform: 'capitalize',
              }}>
              {t === 'safety' ? 'Safety Analysis' : t === 'versions' ? 'Version History' : t === 'test' ? 'Test' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {tab === 'content' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Prompt Content</p>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>{record.tokenCount} tokens</span>
              </div>
              <pre style={{ fontSize: 12, fontFamily: 'monospace', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', padding: 14, whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'hsl(var(--text-2))', overflowX: 'auto', marginBottom: 14 }}>
                {record.content}
              </pre>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {record.tags.map(t => (
                  <span key={t} style={{ fontSize: 10, padding: '3px 8px', background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{t}</span>
                ))}
              </div>
              {record.approvedBy && (
                <div style={{ marginTop: 14, padding: '10px 12px', background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={14} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />
                  <span style={{ fontSize: 12, color: 'hsl(var(--s-ok-tx))', fontWeight: 600 }}>Approved by {record.approvedBy} on {formatDate(record.approvalDate!)}</span>
                </div>
              )}
            </div>
          )}

          {tab === 'test' && (() => {
            const names = Array.from(new Set([...record.content.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map(m => m[1])));
            const composed = record.content.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, k) => (vars[k]?.trim() ? vars[k] : `{{${k}}}`));
            const filled = names.filter(n => vars[n]?.trim()).length;
            const estTokens = Math.max(1, Math.round(composed.split(/\s+/).filter(Boolean).length * 1.3));
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Variables {names.length > 0 && <span style={{ fontFamily: 'monospace' }}>· {filled}/{names.length} filled</span>}
                  </p>
                  {names.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'hsl(var(--text-4))' }}>This prompt has no <code>{'{{variables}}'}</code>. The rendered output below is ready to send.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {names.map(n => (
                        <div key={n} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, alignItems: 'center' }}>
                          <label style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-3))' }}>{`{{${n}}}`}</label>
                          <Input value={vars[n] ?? ''} onChange={e => setVars(p => ({ ...p, [n]: e.target.value }))} placeholder={`value for ${n}`} style={{ borderRadius: 0 }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Rendered Prompt</p>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>~{estTokens} tokens · target {record.model}</span>
                  </div>
                  <pre style={{ fontSize: 12, fontFamily: 'monospace', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', padding: 14, whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'hsl(var(--text-2))', overflowX: 'auto' }}>{composed}</pre>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <Button size="sm" leftIcon={<Copy size={13} />} onClick={() => { navigator.clipboard?.writeText(composed); toast.success('Rendered prompt copied'); }}>Copy rendered</Button>
                    <Button size="sm" variant="outline" disabled={filled < names.length}
                      title={filled < names.length ? 'Fill all variables to run' : `Send to ${record.model}`}
                      onClick={() => toast.success(`Dispatched to ${record.model} — connect a provider in Settings to see live output`)}>
                      Run against {record.model}
                    </Button>
                  </div>
                  <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', marginTop: 6 }}>Test-only. Runs use the model configured for this prompt; wire a provider key in Settings for live completions.</p>
                </div>
              </div>
            );
          })()}

          {tab === 'safety' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '12px 14px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Heuristic Safety Pre-Screen</p>
                {[
                  {
                    label: 'Prompt Injection Risk',
                    value: safetyAnalysis.injectionRisk,
                    ok: safetyAnalysis.injectionRisk === 'LOW',
                    warn: safetyAnalysis.injectionRisk === 'MEDIUM',
                    desc: 'Susceptibility to adversarial injection or jailbreak via user input.',
                  },
                  {
                    label: 'PII Leakage Risk',
                    value: safetyAnalysis.piiDetected ? 'DETECTED' : 'NONE',
                    ok: !safetyAnalysis.piiDetected,
                    warn: false,
                    desc: 'Presence of PII-sensitive field references that may expose personal data.',
                  },
                  {
                    label: 'Jailbreak Resistance',
                    value: safetyAnalysis.jailbreakResistance,
                    ok: safetyAnalysis.jailbreakResistance === 'HIGH',
                    warn: safetyAnalysis.jailbreakResistance === 'MEDIUM',
                    desc: 'Resistance to role-play or DAN-style adversarial override attempts.',
                  },
                  {
                    label: 'Data Exfiltration Pattern',
                    value: safetyAnalysis.dataExfil,
                    ok: safetyAnalysis.dataExfil === 'NONE',
                    warn: safetyAnalysis.dataExfil === 'LOW',
                    desc: 'Presence of instruction patterns that may exfiltrate system data.',
                  },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))', marginBottom: 2 }}>{item.label}</p>
                      <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{item.desc}</p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '3px 8px', marginLeft: 12, letterSpacing: '0.05em', flexShrink: 0,
                      background: item.ok ? 'hsl(var(--s-ok-bg))' : item.warn ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-er-bg))',
                      color: item.ok ? 'hsl(var(--s-ok-tx))' : item.warn ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))',
                      border: `1px solid ${item.ok ? 'hsl(var(--s-ok-br))' : item.warn ? 'hsl(var(--s-wn-br))' : 'hsl(var(--s-er-br))'}`,
                    }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Toxicity bar */}
              <div style={{ padding: '12px 14px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Toxicity Score</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 8, background: 'hsl(var(--bg-muted))' }}>
                    <div style={{ height: '100%', width: `${safetyAnalysis.toxicityScore}%`, background: safetyAnalysis.toxicityScore > 20 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))', transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: safetyAnalysis.toxicityScore > 20 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))', minWidth: 40, textAlign: 'right' }}>{safetyAnalysis.toxicityScore}/100</span>
                </div>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 6 }}>Heuristic estimate — lower is safer. Target &lt;20 for production use; wire a classifier in Settings for scored analysis.</p>
              </div>

              <div style={{ padding: '10px 12px', background: 'hsl(var(--brand-subtle))', border: '1px solid hsl(var(--brand-subtle))', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={14} style={{ color: 'hsl(var(--brand))' }} />
                <p style={{ fontSize: 12, color: 'hsl(var(--brand))', margin: 0 }}>Static heuristic pre-screen · Derived {formatDate(record.lastModified)} · Connect a safety classifier in Settings for live scoring</p>
              </div>
            </div>
          )}

          {tab === 'versions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {record.versions.map((v, i) => (
                <div key={v.version} style={{ border: `1px solid ${i === 0 ? 'hsl(var(--brand-subtle))' : 'hsl(var(--border))'}`, padding: '12px 14px', background: i === 0 ? 'hsl(var(--bg-raised))' : 'hsl(var(--bg-surface))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: 'hsl(var(--brand))' }}>v{v.version}</span>
                      {i === 0 && <Badge style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 9 }}>CURRENT</Badge>}
                    </div>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{formatDate(v.changedAt)}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginBottom: 4 }}>by {v.author}</p>
                  <p style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>{v.changeNote}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'meta' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Category', value: categoryLabel(record.category) },
                  { label: 'Model', value: record.model },
                  { label: 'Owner', value: record.owner },
                  { label: 'Version', value: `v${record.currentVersion}` },
                  { label: 'Created', value: formatDate(record.createdDate) },
                  { label: 'Last Modified', value: formatDate(record.lastModified) },
                  { label: 'Approved By', value: record.approvedBy ?? '— Pending' },
                  { label: 'Approval Date', value: record.approvalDate ? formatDate(record.approvalDate) : '— Pending' },
                ].map(m => (
                  <div key={m.label} style={{ border: '1px solid hsl(var(--border))', padding: '10px 12px' }}>
                    <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{m.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))', margin: 0 }}>{m.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LinkSimple size={12} />Used By (Governed Models)
                </p>
                <UsedByModelsLinks modelIds={record.usedByModelIds ?? []} models={models} navigate={navigate} />
              </div>
              {record.usedBy.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Used By (Free-text References)</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {record.usedBy.map(u => (
                      <span key={u} style={{ fontSize: 12, padding: '4px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Robot size={10} />{u}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Edit / Create Sheet ───────────────────────────────────────────────────────
function EditSheet({ record, open, onClose, onSave, models, modelsLoading }: {
  record: PromptRecord | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<PromptRecord> & { changeNote: string }, isNew: boolean) => void;
  models: ModelOption[];
  modelsLoading: boolean;
}) {
  const isNew = record === null;
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PromptCategory>('system');
  const [status, setStatus] = useState<PromptStatus>('draft');
  const [model, setModel] = useState('GPT-4o');
  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [usedByInput, setUsedByInput] = useState('');
  const [usedByModelIds, setUsedByModelIds] = useState<string[]>([]);
  const [changeNote, setChangeNote] = useState('');

  const reset = useCallback(() => {
    if (record) {
      setName(record.name); setCategory(record.category); setStatus(record.status);
      setModel(record.model); setOwner(record.owner); setDescription(record.description);
      setContent(record.content); setTagsInput(record.tags.join(', '));
      setUsedByInput(record.usedBy.join(', ')); setUsedByModelIds(record.usedByModelIds ?? []); setChangeNote('');
    } else {
      setName(''); setCategory('system'); setStatus('draft');
      setModel('GPT-4o'); setOwner(''); setDescription('');
      setContent(''); setTagsInput(''); setUsedByInput(''); setUsedByModelIds([]); setChangeNote('');
    }
  }, [record]);

  const toggleModelId = (id: string) =>
    setUsedByModelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Reset when sheet opens
  const handleOpenChange = (v: boolean) => {
    if (v) reset();
    else onClose();
  };

  const estTokens = Math.round(content.split(/\s+/).filter(Boolean).length * 1.3);
  const canSave = !!(name.trim() && content.trim() && owner.trim());

  const handleSave = () => {
    onSave({
      ...(record ?? {}),
      name, category, status, model, owner, description, content,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      usedBy: usedByInput.split(',').map(t => t.trim()).filter(Boolean),
      usedByModelIds,
      changeNote,
    }, isNew);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-[620px] max-w-full flex flex-col overflow-hidden p-0 bg-surface">
        <SheetHeader className="px-6 py-4 border-b border-[hsl(var(--border))] flex-shrink-0">
          <SheetTitle className="text-base font-bold text-[hsl(var(--text-1))]">
            {isNew ? 'Register New Prompt' : `Edit — ${record?.name}`}
          </SheetTitle>
          {!isNew && (
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">
              Current: v{record?.currentVersion} → saving creates v{bumpVersion(record?.currentVersion ?? '1.0.0')}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Prompt Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. LoanDecision-System-v4" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Category</label>
              <Select value={category} onValueChange={v => setCategory(v as PromptCategory)}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['system','user','tool_call','safety','chain_of_thought'] as PromptCategory[]).map(c => (
                    <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Status</label>
              <Select value={status} onValueChange={v => setStatus(v as PromptStatus)}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['active','draft','under_review','deprecated'] as PromptStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{statusConfig(s).label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Model</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['GPT-4o','GPT-4o-Mini','GPT-3.5-Turbo','Claude-3-Opus','Claude-3-Sonnet','Claude-3-Haiku','Mistral-7B-Instruct','Llama-3-70B','Internal'].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Owner *</label>
              <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. Sarah Chen" className="text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Brief description of this prompt's purpose and compliance context"
              className="w-full text-sm border border-[hsl(var(--border))] bg-raised px-3 py-2 resize-none text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 flex items-center justify-between">
              <span>Prompt Content *</span>
              {content && <span className="text-[10px] text-[hsl(var(--text-4))] font-normal">~{estTokens} tokens est.</span>}
            </label>
            <textarea
              value={content} onChange={e => setContent(e.target.value)} rows={10}
              placeholder="Enter the full prompt content…"
              className="w-full text-xs font-mono border border-[hsl(var(--border))] bg-raised px-3 py-2 resize-y text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Tags (comma-separated)</label>
              <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="compliance, PII, safety" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">Used By (free-text, comma-separated)</label>
              <Input value={usedByInput} onChange={e => setUsedByInput(e.target.value)} placeholder="MDL-001, ComplianceBot" className="text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><LinkSimple size={12} />Used by (governed models)</span>
              {usedByModelIds.length > 0 && (
                <span className="text-[10px] text-[hsl(var(--brand))] font-normal">{usedByModelIds.length} selected</span>
              )}
            </label>
            <div className="border border-[hsl(var(--border))] bg-raised max-h-44 overflow-y-auto">
              {modelsLoading ? (
                <p className="text-xs text-[hsl(var(--text-4))] px-3 py-3">Loading models…</p>
              ) : models.length === 0 ? (
                <p className="text-xs text-[hsl(var(--text-4))] px-3 py-3">No governed models in the registry yet.</p>
              ) : (
                models.map(m => {
                  const checked = usedByModelIds.includes(m.id);
                  return (
                    <label key={m.id}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--bg-muted))] transition-colors">
                      <input type="checkbox" checked={checked} onChange={() => toggleModelId(m.id)}
                        className="accent-[hsl(var(--brand))] cursor-pointer" />
                      <span className="text-sm text-[hsl(var(--text-1))] flex-1 truncate">{m.name}</span>
                      {m.riskTier && (
                        <span className="text-[9px] uppercase font-bold tracking-wide text-[hsl(var(--text-4))]">{m.riskTier}</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">Links this prompt to registry models that use it — shown as clickable interlinks on the prompt detail.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-[hsl(var(--text-2))] mb-1 block">
              {isNew ? 'Initial Version Note' : 'Change Note (required for version bump)'}
            </label>
            <Input
              value={changeNote} onChange={e => setChangeNote(e.target.value)}
              placeholder="Describe what changed and why…"
              className="text-sm"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex items-center justify-between flex-shrink-0 bg-raised">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canSave} onClick={handleSave}
            style={{ background: canSave ? 'hsl(var(--brand))' : undefined, color: canSave ? 'white' : undefined }}>
            {isNew ? 'Register Prompt' : `Save → v${bumpVersion(record?.currentVersion ?? '1.0.0')}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PromptRegistry() {
  const { records, isLoading, save: savePrompt, remove: removePrompt } = usePromptRegistryData();
  const { models, loading: modelsLoading } = useModelOptions();
  const navigate = useNavigate();
  const reviewer = useAuthStore(s => s.user?.name || s.user?.email || 'Reviewer');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<PromptStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<PromptCategory | 'all'>('all');
  const [viewRecord, setViewRecord] = useState<PromptRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PromptRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromptRecord | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, text, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const filtered = useMemo(() => {
    let list = records;
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
    if (filterCategory !== 'all') list = list.filter(r => r.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [records, search, filterStatus, filterCategory]);

  const openNew = () => { setEditRecord(null); setEditOpen(true); };
  const openEdit = (r: PromptRecord) => { setEditRecord(r); setEditOpen(true); };

  const handleSave = useCallback((data: Partial<PromptRecord> & { changeNote: string }, isNew: boolean) => {
    const now = new Date().toISOString();
    if (isNew) {
      const rec: PromptRecord = {
        id: generateId(),
        name: data.name ?? 'Untitled',
        category: (data.category ?? 'system') as PromptCategory,
        status: (data.status ?? 'draft') as PromptStatus,
        model: data.model ?? 'GPT-4o',
        owner: data.owner ?? '',
        currentVersion: '1.0.0',
        description: data.description ?? '',
        content: data.content ?? '',
        tags: data.tags ?? [],
        usedBy: data.usedBy ?? [],
        usedByModelIds: data.usedByModelIds ?? [],
        tokenCount: Math.round((data.content ?? '').split(/\s+/).filter(Boolean).length * 1.3),
        lastModified: now, createdDate: now,
        approvedBy: null, approvalDate: null,
        versions: [{ version: '1.0.0', content: data.content ?? '', author: data.owner ?? '', changedAt: now, changeNote: data.changeNote || 'Initial version.' }],
      };
      savePrompt(rec)
        .then(() => toast(`Created "${rec.name}" (v1.0.0)`))
        .catch(() => toast('Failed to save prompt', 'error'));
    } else {
      const existing = records.find(r => r.id === (data as PromptRecord).id);
      if (!existing) return;
      const newVer = bumpVersion(existing.currentVersion);
      const updated: PromptRecord = {
        ...existing,
        name: data.name ?? existing.name,
        category: (data.category ?? existing.category) as PromptCategory,
        status: (data.status ?? existing.status) as PromptStatus,
        model: data.model ?? existing.model,
        owner: data.owner ?? existing.owner,
        description: data.description ?? existing.description,
        content: data.content ?? existing.content,
        tags: data.tags ?? existing.tags,
        usedBy: data.usedBy ?? existing.usedBy,
        usedByModelIds: data.usedByModelIds ?? existing.usedByModelIds ?? [],
        tokenCount: Math.round((data.content ?? existing.content).split(/\s+/).filter(Boolean).length * 1.3),
        currentVersion: newVer, lastModified: now,
        approvedBy: null, approvalDate: null,
        versions: [{ version: newVer, content: data.content ?? existing.content, author: data.owner ?? existing.owner, changedAt: now, changeNote: data.changeNote || 'Updated.' }, ...existing.versions],
      };
      savePrompt(updated)
        .then(() => toast(`Updated "${updated.name}" → v${newVer}`))
        .catch(() => toast('Failed to save prompt', 'error'));
    }
    setEditOpen(false);
  }, [records, toast, savePrompt]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    removePrompt(target.id)
      .then(() => toast(`Deleted "${target.name}"`, 'info'))
      .catch(() => toast('Failed to delete prompt', 'error'));
  }, [deleteTarget, toast, removePrompt]);

  // Approve / Reject / Submit now persist a real status transition (and the
  // approver + approval date on approval) instead of firing a toast-only stub.
  const handleAction = useCallback((rec: PromptRecord, action: 'approve' | 'reject' | 'submit') => {
    const now = new Date().toISOString();
    const updated: PromptRecord =
      action === 'approve'
        ? { ...rec, status: 'active', approvedBy: reviewer, approvalDate: now, lastModified: now }
        : action === 'reject'
        ? { ...rec, status: 'draft', approvedBy: null, approvalDate: null, lastModified: now }
        : { ...rec, status: 'under_review', lastModified: now };
    savePrompt(updated)
      .then(() => {
        toast(
          action === 'approve' ? `"${rec.name}" approved and promoted to Active`
            : action === 'reject' ? `"${rec.name}" rejected — returned to draft`
            : `"${rec.name}" submitted for review`,
          action === 'reject' ? 'error' : action === 'submit' ? 'info' : 'success',
        );
        setViewRecord(updated);
      })
      .catch(() => toast('Failed to update prompt status', 'error'));
  }, [reviewer, savePrompt, toast]);

  if (isLoading && records.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--bg-page))]">
      {/* Page Header */}
      <div className="px-6 py-3 border-b border-[hsl(var(--border))] bg-surface flex-shrink-0">
        <PageHeader
          title="Prompt Registry"
          subtitle={`Version-controlled governance for system prompts · ${records.length} registered`}
          actions={
            <Button size="sm" onClick={openNew}
              style={{ background: 'hsl(var(--brand))', color: 'white' }}
              className="flex items-center gap-2">
              <Plus size={14} weight="bold" /> New Prompt
            </Button>
          }
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <StatsRow records={records} />

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
            <Input
              placeholder="Search by name, content, owner, or tag…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 text-sm h-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as PromptStatus | 'all')}>
            <SelectTrigger className="w-40 text-sm h-9">
              <Funnel size={12} className="mr-1 text-[hsl(var(--text-4))]" /><SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(['active','under_review','draft','deprecated'] as PromptStatus[]).map(s => (
                <SelectItem key={s} value={s}>{statusConfig(s).label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={v => setFilterCategory(v as PromptCategory | 'all')}>
            <SelectTrigger className="w-44 text-sm h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {(['system','user','tool_call','safety','chain_of_thought'] as PromptCategory[]).map(c => (
                <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-9 text-xs"
            onClick={() => { setSearch(''); setFilterStatus('all'); setFilterCategory('all'); }}>
            <ArrowsClockwise size={12} />Reset
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ChatTeardropText size={40} className="text-[hsl(var(--text-4))] mb-3" />
            <p className="text-sm text-[hsl(var(--text-3))] mb-1">No prompts match your filters</p>
            <p className="text-xs text-[hsl(var(--text-4))]">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(r => (
              <PromptCard key={r.id} record={r} onView={setViewRecord} onEdit={openEdit} onDelete={setDeleteTarget} models={models} navigate={navigate} />
            ))}
          </div>
        )}
      </div>

      {/* Overlays */}
      <ViewSheet record={viewRecord} open={!!viewRecord} onClose={() => setViewRecord(null)} onAction={handleAction} models={models} navigate={navigate} />
      <EditSheet record={editRecord} open={editOpen} onClose={() => setEditOpen(false)} onSave={handleSave} models={models} modelsLoading={modelsLoading} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Prompt?"
        message={`Permanently delete "${deleteTarget?.name}" (v${deleteTarget?.currentVersion}) and all version history? This cannot be undone.`}
        confirmLabel="Delete Permanently"
        type="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
      <Toaster toasts={toasts} remove={id => setToasts(p => p.filter(t => t.id !== id))} />
    </div>
  );
}
