import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { exportCsv } from '@/lib/exportUtils'
import { Plus, Eye, X, Trash, PencilSimple, Export, CheckCircle, MagnifyingGlass, ArrowRight, ArrowSquareOut, Prohibit, Spinner, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useImpactAssessments, useModelOptions } from '@/hooks/useAiiaData'
import type { ImpactAssessment } from '@/services/impactAssessmentService'
import { fetchUseCases, type UseCase } from '@/services/useCaseService'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { StatCardRow } from '../components/ui/StatCardRow'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { PageHeader } from '../components/ui/PageHeader'

// ── Vocabulary (matches the real ai_impact_assessments table) ─────────────────
const STATUS_OPTIONS = ['draft', 'in_review', 'approved', 'rejected'] as const
const RISK_OPTIONS = ['low', 'medium', 'high', 'critical'] as const
const RAG_OPTIONS = ['green', 'amber', 'red'] as const
const TYPE_OPTIONS = ['AIIA', 'FRIA', 'DPIA', 'Conformity'] as const

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', in_review: 'In Review', approved: 'Approved', rejected: 'Rejected',
}
const RISK_LABEL: Record<string, string> = {
  low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
}
const RAG_LABEL: Record<string, string> = { green: 'Green', amber: 'Amber', red: 'Red' }

type Badgeish = { bg: string; color: string; border?: string }
const NEUTRAL: Badgeish = { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]', border: 'border-[hsl(var(--border))]' }

// Fixed: background uses the -bg token, text uses the -tx token (was both -tx).
function statusStyle(s: string): Badgeish {
  switch (s) {
    case 'approved': return { bg: 'bg-[hsl(var(--s-ok-bg))]', color: 'text-[hsl(var(--s-ok-tx))]' }
    case 'in_review': return { bg: 'bg-[hsl(var(--s-wn-bg))]', color: 'text-[hsl(var(--s-wn-tx))]' }
    case 'rejected': return { bg: 'bg-[hsl(var(--s-er-bg))]', color: 'text-[hsl(var(--s-er-tx))]' }
    case 'draft': return { bg: 'bg-[hsl(var(--s-in-bg))]', color: 'text-[hsl(var(--s-in-tx))]' }
    default: return NEUTRAL
  }
}
function riskStyle(r: string): Badgeish {
  switch (r) {
    case 'critical': return { bg: 'bg-[hsl(var(--s-er-bg))]', color: 'text-[hsl(var(--s-er-tx))]' }
    case 'high': return { bg: 'bg-[hsl(var(--s-wn-bg))]', color: 'text-[hsl(var(--s-wn-tx))]' }
    case 'medium': return { bg: 'bg-[hsl(var(--s-in-bg))]', color: 'text-[hsl(var(--s-in-tx))]' }
    case 'low': return { bg: 'bg-[hsl(var(--s-ok-bg))]', color: 'text-[hsl(var(--s-ok-tx))]' }
    default: return NEUTRAL
  }
}
function ragStyle(r: string): Badgeish {
  switch (r) {
    case 'green': return { bg: 'bg-[hsl(var(--s-ok-bg))]', color: 'text-[hsl(var(--s-ok-tx))]' }
    case 'amber': return { bg: 'bg-[hsl(var(--s-wn-bg))]', color: 'text-[hsl(var(--s-wn-tx))]' }
    case 'red': return { bg: 'bg-[hsl(var(--s-er-bg))]', color: 'text-[hsl(var(--s-er-tx))]' }
    default: return NEUTRAL
  }
}
function mitigationStyle(s: string): Badgeish {
  const v = (s || '').toLowerCase()
  if (v.includes('implement') || v.includes('done') || v.includes('complete')) return { bg: 'bg-[hsl(var(--s-ok-bg))]', color: 'text-[hsl(var(--s-ok-tx))]' }
  if (v.includes('plan') || v.includes('progress') || v.includes('pending')) return { bg: 'bg-[hsl(var(--s-wn-bg))]', color: 'text-[hsl(var(--s-wn-tx))]' }
  return NEUTRAL
}
function findingStyle(sev: string): Badgeish {
  const v = (sev || '').toLowerCase()
  if (v.includes('high') || v.includes('critical')) return { bg: 'bg-[hsl(var(--s-er-bg))]', color: 'text-[hsl(var(--s-er-tx))]', border: 'border-[hsl(var(--s-er-br))]' }
  if (v.includes('medium') || v.includes('moderate')) return { bg: 'bg-[hsl(var(--s-wn-bg))]', color: 'text-[hsl(var(--s-wn-tx))]', border: 'border-[hsl(var(--s-wn-br))]' }
  if (v.includes('low')) return { bg: 'bg-[hsl(var(--s-ok-bg))]', color: 'text-[hsl(var(--s-ok-tx))]', border: 'border-[hsl(var(--s-ok-br))]' }
  return NEUTRAL
}
function findingStatusStyle(s: string): Badgeish {
  const v = (s || '').toLowerCase()
  if (v.includes('resolved') || v.includes('closed')) return { bg: 'bg-[hsl(var(--s-ok-bg))]', color: 'text-[hsl(var(--s-ok-tx))]' }
  return { bg: 'bg-[hsl(var(--s-wn-bg))]', color: 'text-[hsl(var(--s-wn-tx))]' }
}

type FormState = {
  title: string
  type: string
  riskLevel: string
  status: string
  ragStatus: string
  progressPct: number
  assessor: string
  reviewer: string
  summary: string
  affectedEntities: string[]
  modelId: string | null
  useCaseId: string | null
  nextReview: string | null
}

const BLANK: FormState = {
  title: '', type: 'AIIA', riskLevel: 'medium', status: 'draft', ragStatus: 'amber',
  progressPct: 0, assessor: '', reviewer: '', summary: '', affectedEntities: [],
  modelId: null, useCaseId: null, nextReview: null,
}

export default function AIImpactAssessments() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')
  const { data: records, isLoading, error, save, remove } = useImpactAssessments()
  const { models } = useModelOptions()
  const { data: useCases } = useQuery<UseCase[]>({ queryKey: ['use-cases'], queryFn: fetchUseCases, staleTime: 20_000 })

  // Resolve a linked entity's display name; when an id is present but can't be
  // resolved to a name, show "Unavailable" rather than leaking a raw uuid.
  const modelName = (id: string | null) => (id ? (models.find(m => m.id === id)?.name ?? 'Unavailable') : null)
  const useCaseTitle = (id: string | null) => (id ? (useCases?.find(u => u.id === id)?.title ?? 'Unavailable') : null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [riskFilter, setRiskFilter] = useState('All')
  const [selected, setSelected] = useState<ImpactAssessment | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ImpactAssessment | null>(null)
  const [form, setForm] = useState<FormState>(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<ImpactAssessment | null>(null)

  // Escape-to-close for drawer + modal
  useEffect(() => {
    if (!selected && !formOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setFormOpen(false); setSelected(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, formOpen])

  // Keep the open drawer in sync with refreshed data after a mutation
  useEffect(() => {
    if (selected) {
      const fresh = records.find(r => r.id === selected.id)
      if (fresh && fresh !== selected) setSelected(fresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records])

  // Deep-link: ?open=<id> opens that record's detail drawer once it loads.
  const openedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!openParam || records.length === 0) return
    if (openedRef.current === openParam) return
    const rec = records.find(r => r.id === openParam)
    if (rec) { setSelected(rec); openedRef.current = openParam }
  }, [openParam, records])

  const filtered = useMemo(() => records.filter(r => {
    const q = search.toLowerCase()
    const ms = r.title.toLowerCase().includes(q)
      || r.assessmentId.toLowerCase().includes(q)
      || r.assessor.toLowerCase().includes(q)
      || r.type.toLowerCase().includes(q)
    const modelMatch = !modelParam || r.modelId === modelParam
    return ms && modelMatch && (statusFilter === 'All' || r.status === statusFilter) && (riskFilter === 'All' || r.riskLevel === riskFilter)
  }), [records, search, statusFilter, riskFilter, modelParam])

  const stats = {
    total: records.length,
    critical: records.filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high').length,
    pending: records.filter(r => r.status === 'in_review').length,
    completed: records.filter(r => r.status === 'approved').length,
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK })
    setFormOpen(true)
  }

  function openEdit(r: ImpactAssessment) {
    setEditing(r)
    setForm({
      title: r.title, type: r.type, riskLevel: r.riskLevel, status: r.status, ragStatus: r.ragStatus,
      progressPct: r.progressPct, assessor: r.assessor, reviewer: r.reviewer, summary: r.summary,
      affectedEntities: r.affectedEntities, modelId: r.modelId, useCaseId: r.useCaseId, nextReview: r.nextReview,
    })
    setFormOpen(true)
    setSelected(null)
  }

  function saveForm() {
    if (!form.title.trim()) { toast.error('Title is required.'); return }
    const payload: Partial<ImpactAssessment> = {
      ...(editing ? { id: editing.id } : {}),
      title: form.title.trim(),
      type: form.type,
      riskLevel: form.riskLevel,
      status: form.status,
      ragStatus: form.ragStatus,
      progressPct: Number(form.progressPct) || 0,
      assessor: form.assessor,
      reviewer: form.reviewer,
      summary: form.summary,
      affectedEntities: form.affectedEntities,
      modelId: form.modelId,
      useCaseId: form.useCaseId,
      nextReview: form.nextReview || null,
    }
    save.mutate(payload, {
      onSuccess: () => {
        toast.success(editing ? 'Assessment updated' : 'Assessment created')
        setFormOpen(false)
      },
      onError: (err: any) => toast.error(err?.message ?? 'Failed to save assessment'),
    })
  }

  function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    remove.mutate(target.id, {
      onSuccess: () => {
        toast.success(`Assessment ${target.assessmentId} deleted`)
        if (selected?.id === target.id) setSelected(null)
        setDeleteTarget(null)
      },
      onError: (err: any) => { toast.error(err?.message ?? 'Failed to delete assessment'); setDeleteTarget(null) },
    })
  }

  function transition(r: ImpactAssessment, patch: Partial<ImpactAssessment>, successMsg: string) {
    save.mutate({ id: r.id, ...patch }, {
      onSuccess: () => toast.success(successMsg),
      onError: (err: any) => toast.error(err?.message ?? 'Failed to update assessment'),
    })
  }

  const submitForReview = (r: ImpactAssessment) => transition(r, { status: 'in_review' }, `${r.assessmentId} submitted for review`)
  const approveAssessment = (r: ImpactAssessment) => transition(r, { status: 'approved', approvedAt: new Date().toISOString() }, `${r.assessmentId} approved`)
  const rejectAssessment = (r: ImpactAssessment) => transition(r, { status: 'rejected' }, `${r.assessmentId} rejected`)

  const sf = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const csvRows = filtered.map(r => ({
    id: r.assessmentId,
    title: r.title,
    type: r.type,
    riskLevel: r.riskLevel,
    status: r.status,
    progressPct: r.progressPct,
    assessor: r.assessor,
    reviewer: r.reviewer,
    ragStatus: r.ragStatus,
    model: modelName(r.modelId) ?? '',
    useCase: useCaseTitle(r.useCaseId) ?? '',
    nextReview: r.nextReview ?? '',
    approvedAt: r.approvedAt ?? '',
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <PageHeader
          title="AI Impact Assessments"
          description="Document and review the impact of AI systems on individuals and society per EU AI Act Art. 9"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportCsv(csvRows, 'ai-impact-assessments.csv')} className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))]">
            <Export size={16} /> Export
          </Button>
          <Button onClick={openCreate} className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]">
            <Plus size={16} /> New Assessment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatCardRow cards={[
        { label: 'Total Assessments', value: stats.total, variant: 'default' },
        { label: 'High / Critical Risk', value: stats.critical, variant: 'error' },
        { label: 'In Review', value: stats.pending, variant: 'warn' },
        { label: 'Approved', value: stats.completed, variant: 'ok' },
      ]} />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-3))]" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assessments…"
            className="pl-9 bg-surface border-[hsl(var(--border))] rounded-none h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="All">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="All">All Risk Levels</SelectItem>
            {RISK_OPTIONS.map(s => <SelectItem key={s} value={s}>{RISK_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Model-scoped filter chip (deep-link from a model's Governance card) */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{modelName(modelParam)}</strong></span>
            <button
              aria-label="Clear model filter"
              onClick={() => setSearchParams({})}
              className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer"
            >
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {/* Table */}
      <Card className="border-[hsl(var(--border))] bg-surface rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[hsl(var(--text-2))] uppercase bg-raised border-b border-[hsl(var(--border))]">
              <tr>
                {['ID', 'Title', 'Type', 'Risk Level', 'Status', 'Assessor', 'Next Review', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-[hsl(var(--text-3))]">
                  <span className="inline-flex items-center gap-2"><Spinner size={18} className="animate-spin" /> Loading assessments…</span>
                </td></tr>
              )}
              {!isLoading && error && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-[hsl(var(--s-er-tx))]">
                  <span className="inline-flex items-center gap-2"><Warning size={18} /> Failed to load assessments: {error.message}</span>
                </td></tr>
              )}
              {!isLoading && !error && records.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-[hsl(var(--text-3))]">
                  <div className="flex flex-col items-center gap-2">
                    <span>No impact assessments yet.</span>
                    <Button size="sm" onClick={openCreate} className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]"><Plus size={14} /> New Assessment</Button>
                  </div>
                </td></tr>
              )}
              {!isLoading && !error && records.length > 0 && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-[hsl(var(--text-3))]">No assessments match your filters.</td></tr>
              )}
              {!isLoading && !error && filtered.map(r => {
                const ss = statusStyle(r.status)
                const rs = riskStyle(r.riskLevel)
                return (
                  <tr key={r.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-muted))] transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{r.assessmentId}</td>
                    <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))] max-w-[220px] truncate">{r.title}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-2))]">{r.type}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${rs.bg} ${rs.color} border-0 rounded-none uppercase text-[10px]`}>{RISK_LABEL[r.riskLevel] ?? r.riskLevel}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${ss.bg} ${ss.color} border-0 rounded-none`}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-2))]">{r.assessor || '—'}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))] font-mono text-xs">{r.nextReview ? r.nextReview.slice(0, 10) : '—'}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button aria-label={`View ${r.assessmentId}`} variant="ghost" size="sm" onClick={() => setSelected(r)} className="h-8 w-8 p-0 text-[hsl(var(--text-2))] hover:text-[hsl(var(--brand))] rounded-none"><Eye size={16} /></Button>
                        <Button aria-label={`Edit ${r.assessmentId}`} variant="ghost" size="sm" onClick={() => openEdit(r)} className="h-8 w-8 p-0 text-[hsl(var(--text-2))] hover:text-[hsl(var(--brand))] rounded-none"><PencilSimple size={16} /></Button>
                        <Button aria-label={`Delete ${r.assessmentId}`} variant="ghost" size="sm" onClick={() => setDeleteTarget(r)} className="h-8 w-8 p-0 text-[hsl(var(--text-2))] hover:text-[hsl(var(--s-er-tx))] rounded-none"><Trash size={16} /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-xs text-[hsl(var(--text-3))] bg-raised border-t border-[hsl(var(--border))]">
          Showing {filtered.length} of {records.length} assessments
        </div>
      </Card>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={`Assessment ${selected.assessmentId}`}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative ml-auto w-[700px] max-w-full h-full bg-surface border-l border-[hsl(var(--border))] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[hsl(var(--border))] bg-raised">
              <div>
                <span className="font-mono text-xs text-[hsl(var(--brand))] mb-1 block">{selected.assessmentId}</span>
                <h2 className="text-lg font-bold text-[hsl(var(--text-1))]">{selected.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`${statusStyle(selected.status).bg} ${statusStyle(selected.status).color} border-0 rounded-none`}>{STATUS_LABEL[selected.status] ?? selected.status}</Badge>
                  <Badge className={`${riskStyle(selected.riskLevel).bg} ${riskStyle(selected.riskLevel).color} border-0 rounded-none uppercase text-[10px]`}>{RISK_LABEL[selected.riskLevel] ?? selected.riskLevel} Risk</Badge>
                  <Badge className={`${ragStyle(selected.ragStatus).bg} ${ragStyle(selected.ragStatus).color} border-0 rounded-none uppercase text-[10px]`}>RAG: {RAG_LABEL[selected.ragStatus] ?? selected.ragStatus}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(selected)} className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))]"><PencilSimple size={16} /> Edit</Button>
                {selected.status === 'draft' && (
                  <Button size="sm" onClick={() => submitForReview(selected)} className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]"><ArrowRight size={16} /> Submit for Review</Button>
                )}
                {selected.status === 'in_review' && (
                  <>
                    <Button size="sm" onClick={() => approveAssessment(selected)} className="rounded-none bg-[hsl(var(--s-ok-tx))] hover:opacity-90 text-white"><CheckCircle size={16} /> Approve</Button>
                    <Button size="sm" onClick={() => rejectAssessment(selected)} className="rounded-none bg-[hsl(var(--s-er-tx))] hover:opacity-90 text-white"><Prohibit size={16} /> Reject</Button>
                  </>
                )}
                <Button aria-label="Close" variant="ghost" size="sm" onClick={() => setSelected(null)} className="h-8 w-8 p-0 rounded-none"><X size={20} className="text-[hsl(var(--text-3))]" /></Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="overview" className="flex-1 flex flex-col h-full">
                <div className="px-6 border-b border-[hsl(var(--border))] bg-raised">
                  <TabsList className="bg-transparent space-x-4 h-12 p-0">
                    <TabsTrigger value="overview" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Overview</TabsTrigger>
                    <TabsTrigger value="mitigations" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Mitigations & Findings</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto p-6 text-sm">
                  <TabsContent value="overview" className="m-0 space-y-6 focus:outline-none">
                    {/* Overview Grid */}
                    <div className="grid grid-cols-2 gap-4 p-5 border border-[hsl(var(--border))] bg-raised rounded-none">
                      <InfoRow label="Type" value={selected.type} />
                      <InfoRow label="Progress" value={selected.progressPct != null ? `${selected.progressPct}%` : '—'} />
                      <InfoRow label="Assessor" value={selected.assessor || '—'} />
                      <InfoRow label="Reviewer" value={selected.reviewer || '—'} />
                      <InfoRow label="Next Review" value={selected.nextReview ? selected.nextReview.slice(0, 10) : '—'} />
                      <InfoRow label="Approved At" value={selected.approvedAt ? selected.approvedAt.slice(0, 10) : '—'} />
                    </div>

                    {/* Interlinks */}
                    <Section title="Linked Records">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-[hsl(var(--text-3))] uppercase tracking-wider mb-1">Model</p>
                          {selected.modelId ? (
                            <PillLink label={modelName(selected.modelId)!} onClick={() => navigate(`/models/${selected.modelId}`)} />
                          ) : <p className="text-sm text-[hsl(var(--text-3))]">—</p>}
                        </div>
                        <div>
                          <p className="text-xs text-[hsl(var(--text-3))] uppercase tracking-wider mb-1">Use Case</p>
                          {selected.useCaseId ? (
                            <PillLink label={useCaseTitle(selected.useCaseId)!} onClick={() => navigate(`/use-cases/${selected.useCaseId}`)} />
                          ) : <p className="text-sm text-[hsl(var(--text-3))]">—</p>}
                        </div>
                      </div>
                    </Section>

                    <Section title="Summary">
                      <p className="text-[hsl(var(--text-2))] text-sm leading-relaxed">{selected.summary || 'No summary provided.'}</p>
                    </Section>

                    <Section title="Affected Entities">
                      {selected.affectedEntities.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--text-3))]">None recorded.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selected.affectedEntities.map((d, i) => <Badge key={i} className="bg-sunken text-[hsl(var(--text-2))] border-[hsl(var(--border))] rounded-none font-normal">{d}</Badge>)}
                        </div>
                      )}
                    </Section>
                  </TabsContent>

                  <TabsContent value="mitigations" className="m-0 space-y-8 focus:outline-none">
                    <Section title={`Risk Mitigations (${selected.mitigations.length})`}>
                      {selected.mitigations.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--text-3))]">No mitigations recorded.</p>
                      ) : (
                        <div className="space-y-3">
                          {selected.mitigations.map((m, i) => {
                            const st = mitigationStyle(m.status ?? '')
                            return (
                              <div key={i} className="flex items-start justify-between gap-4 p-4 border border-[hsl(var(--border))] bg-raised rounded-none">
                                <p className="text-sm text-[hsl(var(--text-1))]">{m.title}</p>
                                {m.status && <Badge className={`${st.bg} ${st.color} border-0 rounded-none whitespace-nowrap`}>{m.status}</Badge>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </Section>

                    <Section title={`Findings (${selected.findings.length})`}>
                      {selected.findings.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--text-3))]">No findings recorded.</p>
                      ) : (
                        <div className="space-y-3">
                          {selected.findings.map((f, i) => {
                            const sev = findingStyle(f.severity ?? '')
                            const fst = findingStatusStyle(f.status ?? '')
                            return (
                              <div key={i} className={`flex items-start justify-between gap-4 p-4 border border-[hsl(var(--border))] bg-surface border-l-4 ${sev.border ?? 'border-[hsl(var(--border))]'} rounded-none`}>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    {f.severity && <Badge className={`${sev.bg} ${sev.color} border-0 rounded-none uppercase text-[10px]`}>{f.severity} Severity</Badge>}
                                    {f.status && <Badge className={`${fst.bg} ${fst.color} border-0 rounded-none`}>{f.status}</Badge>}
                                  </div>
                                  <p className="text-sm text-[hsl(var(--text-2))]">{f.title}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </Section>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={editing ? 'Edit Assessment' : 'New Assessment'}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFormOpen(false)} />
          <div className="relative w-[700px] max-w-full max-h-[85vh] overflow-y-auto bg-surface border border-[hsl(var(--border))] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[hsl(var(--border))] bg-raised">
              <h2 className="text-lg font-bold text-[hsl(var(--text-1))]">{editing ? 'Edit Assessment' : 'New AI Impact Assessment'}</h2>
              <Button aria-label="Close" variant="ghost" size="sm" onClick={() => setFormOpen(false)} className="h-8 w-8 p-0 rounded-none"><X size={20} className="text-[hsl(var(--text-3))]" /></Button>
            </div>
            <div className="p-6 space-y-6 text-sm">
              <div className="grid grid-cols-2 gap-5">
                <FormField label="Title *">
                  <Input value={form.title} onChange={e => sf('title', e.target.value)} className="rounded-none bg-raised" placeholder="e.g. Customer Scoring Model FRIA" />
                </FormField>
                <FormField label="Type">
                  <Select value={form.type} onValueChange={v => sf('type', v)}>
                    <SelectTrigger className="w-full h-10" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {TYPE_OPTIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Risk Level">
                  <Select value={form.riskLevel} onValueChange={v => sf('riskLevel', v)}>
                    <SelectTrigger className="w-full h-10" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {RISK_OPTIONS.map(v => <SelectItem key={v} value={v}>{RISK_LABEL[v]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Status">
                  <Select value={form.status} onValueChange={v => sf('status', v)}>
                    <SelectTrigger className="w-full h-10" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {STATUS_OPTIONS.map(v => <SelectItem key={v} value={v}>{STATUS_LABEL[v]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="RAG Status">
                  <Select value={form.ragStatus} onValueChange={v => sf('ragStatus', v)}>
                    <SelectTrigger className="w-full h-10" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {RAG_OPTIONS.map(v => <SelectItem key={v} value={v}>{RAG_LABEL[v]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Progress %">
                  <Input type="number" min={0} max={100} value={form.progressPct} onChange={e => sf('progressPct', Number(e.target.value))} className="rounded-none bg-raised" />
                </FormField>
                <FormField label="Assessor">
                  <Input value={form.assessor} onChange={e => sf('assessor', e.target.value)} className="rounded-none bg-raised" placeholder="e.g. Assessor name" />
                </FormField>
                <FormField label="Reviewer">
                  <Input value={form.reviewer} onChange={e => sf('reviewer', e.target.value)} className="rounded-none bg-raised" placeholder="e.g. Reviewer name" />
                </FormField>
                <FormField label="Linked Model">
                  <Select value={form.modelId ?? '__none'} onValueChange={v => sf('modelId', v === '__none' ? null : v)}>
                    <SelectTrigger className="w-full h-10" style={{ borderRadius: 0 }}><SelectValue placeholder="Select a model" /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      <SelectItem value="__none">— None —</SelectItem>
                      {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Linked Use Case">
                  <Select value={form.useCaseId ?? '__none'} onValueChange={v => sf('useCaseId', v === '__none' ? null : v)}>
                    <SelectTrigger className="w-full h-10" style={{ borderRadius: 0 }}><SelectValue placeholder="Select a use case" /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      <SelectItem value="__none">— None —</SelectItem>
                      {(useCases ?? []).map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Next Review Date">
                  <Input type="date" value={form.nextReview ? form.nextReview.slice(0, 10) : ''} onChange={e => sf('nextReview', e.target.value || null)} className="rounded-none bg-raised" />
                </FormField>
              </div>
              <FormField label="Summary">
                <textarea value={form.summary} onChange={e => sf('summary', e.target.value)} rows={3} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] text-sm focus:outline-none resize-none rounded-none" placeholder="Describe the AI system, its use case and impact…" />
              </FormField>
              <FormField label="Affected Entities (comma-separated)">
                <Input
                  value={form.affectedEntities.join(', ')}
                  onChange={e => sf('affectedEntities', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  className="rounded-none bg-raised"
                  placeholder="e.g. Loan applicants, Cardholders"
                />
              </FormField>
            </div>
            <div className="flex justify-end gap-3 px-6 py-5 border-t border-[hsl(var(--border))] bg-raised">
              <Button variant="outline" onClick={() => setFormOpen(false)} className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))]">Cancel</Button>
              <Button onClick={saveForm} disabled={save.isPending} className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]">
                {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Assessment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Assessment"
        description={`Are you sure you want to delete ${deleteTarget?.assessmentId} — "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// Pill-style interlink to a related entity — clearly clickable, with a hover state.
function PillLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-none border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] cursor-pointer transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
    >
      {label} <ArrowSquareOut size={13} />
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[hsl(var(--text-3))] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-[hsl(var(--text-1))] font-medium">{value}</p>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-[hsl(var(--text-2))] tracking-wide uppercase">{label}</label>
      {children}
    </div>
  )
}
