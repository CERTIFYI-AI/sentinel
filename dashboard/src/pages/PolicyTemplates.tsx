// SPDX-License-Identifier: Apache-2.0
// Policy Templates — the global read-only policy_templates catalog
// (usePolicyTemplates). "Add to Policy Library" performs the REAL
// instantiateTemplate write (draft policy + first policy_versions row) and
// then offers navigation to the new draft in the Policy Library.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { PageHeader } from '../components/ui/PageHeader'
import { Input } from '../components/ui/input'
import { usePolicyTemplates, useInstantiateTemplate } from '@/hooks/useComplianceGroup'
import { useAuthStore } from '../stores/authStore'
import type { PolicyTemplateRecord } from '../services/regulatoryOpsService'
import { exportJson } from '@/lib/exportUtils'
import { toast } from 'sonner'
import { FileText, Download, MagnifyingGlass, ArrowSquareOut } from '@phosphor-icons/react'

export default function PolicyTemplates() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { items: templates, isLoading, error } = usePolicyTemplates()
  const instantiate = useInstantiateTemplate()

  const [search, setSearch] = useState('')
  const [filterFramework, setFilterFramework] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [selected, setSelected] = useState<string | null>(null)
  const [useTarget, setUseTarget] = useState<PolicyTemplateRecord | null>(null)
  // After a successful instantiation: offer navigation to the new draft.
  const [createdPolicyId, setCreatedPolicyId] = useState<string | null>(null)

  // Filters derive from the actual catalog fields — never a hardcoded list.
  const frameworks = useMemo(
    () => ['All', ...Array.from(new Set(templates.map(t => t.framework).filter(Boolean) as string[])).sort()],
    [templates],
  )
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(templates.map(t => t.category).filter(Boolean) as string[])).sort()],
    [templates],
  )

  const filtered = templates.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || t.name.toLowerCase().includes(q)
      || (t.description ?? '').toLowerCase().includes(q)
      || t.clauseRefs.some(c => c.toLowerCase().includes(q))
    const matchFramework = filterFramework === 'All' || t.framework === filterFramework
    const matchCategory = filterCategory === 'All' || t.category === filterCategory
    return matchSearch && matchFramework && matchCategory
  })

  const handleExportAll = () => {
    if (!templates.length) { toast.error('No templates to export'); return }
    exportJson(templates, `policy-templates-${new Date().toISOString().split('T')[0]}.json`)
  }

  const handleAddToLibrary = async () => {
    if (!useTarget) return
    try {
      const policy = await instantiate.mutateAsync({
        template: useTarget,
        byName: user?.fullName ?? user?.email ?? undefined,
      }) // hook toasts success; throws on failure
      setUseTarget(null)
      setCreatedPolicyId(policy.id ?? null)
    } catch { /* hook surfaces the error toast; dialog stays open */ }
  }

  const body = useTarget?.body
  const sections = Array.isArray(body?.sections) ? body!.sections! : []

  return (
    <div className="flex flex-col gap-4 p-4 bg-background text-foreground h-full">
      <PageHeader
        title="Policy Templates"
        subtitle={isLoading ? 'Loading catalog…' : `${filtered.length} of ${templates.length} templates in the catalog`}
        actions={
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={handleExportAll}>
            <Download size={14} /> Export Catalog (JSON)
          </Button>
        }
      />

      {/* Real query error state */}
      {error != null && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load the template catalog</p>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{(error as Error).message}</p>
        </div>
      )}

      {/* Post-create navigation offer */}
      {createdPolicyId && (
        <div className="flex items-center justify-between gap-3 p-3"
          style={{ background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))' }}>
          <p className="text-xs" style={{ color: 'hsl(var(--s-ok-tx))' }}>
            Draft policy created in your Policy Library.
          </p>
          <div className="flex gap-2">
            <Button size="sm" style={{ borderRadius: 0 }} onClick={() => navigate(`/policies?open=${createdPolicyId}`)}>
              <ArrowSquareOut size={13} /> Open in Policy Library
            </Button>
            <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => setCreatedPolicyId(null)}>Dismiss</Button>
          </div>
        </div>
      )}

      {/* Filters — derived from the catalog itself */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative w-64">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <Input
            className="pl-8 h-8 text-sm"
            style={{ borderRadius: 0 }}
            placeholder="Search templates or clauses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterFramework} onValueChange={setFilterFramework}>
          <SelectTrigger className="w-44 h-8 text-xs" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {frameworks.map(f => <SelectItem key={f} value={f}>{f === 'All' ? 'All Frameworks' : f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44 h-8 text-xs" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {categories.map(c => <SelectItem key={c} value={c}>{c === 'All' ? 'All Categories' : c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Honest loading / empty states */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-4))' }}>
          <FileText size={36} />
          <p className="mt-3 text-sm">Loading the template catalog…</p>
        </div>
      )}
      {!isLoading && !error && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-4))' }}>
          <FileText size={36} />
          <p className="mt-3 text-sm font-medium">The template catalog is empty</p>
          <p className="text-xs mt-1">Catalog templates are seeded system-side; none are available yet.</p>
        </div>
      )}
      {!isLoading && templates.length > 0 && filtered.length === 0 && (
        <p className="text-sm py-12 text-center" style={{ color: 'hsl(var(--text-4))' }}>No templates match your filters.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto">
        {filtered.map(t => (
          <div
            key={t.id}
            onClick={() => setSelected(selected === t.id ? null : t.id)}
            className="border border-border bg-card p-4 cursor-pointer hover:border-primary/50 transition-colors flex flex-col gap-2"
            style={{ borderRadius: 0 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium leading-snug">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.framework ?? 'Framework-agnostic'}{t.version ? ` · v${t.version.replace(/^v/i, '')}` : ''}</p>
              </div>
              {t.category && (
                <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{t.category}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {t.clauseRefs.map(c => (
                <span key={c} className="text-[10px] px-1.5 py-0.5"
                  style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', border: '1px solid hsl(var(--border))' }}>
                  {c}
                </span>
              ))}
            </div>
            {selected === t.id && (
              <div className="mt-1">
                {t.description && <p className="text-xs text-muted-foreground mb-2">{t.description}</p>}
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={e => { e.stopPropagation(); setUseTarget(t) }}
                    className="flex-1 text-xs bg-primary text-primary-foreground px-2 py-1 hover:bg-primary/90"
                    style={{ borderRadius: 0 }}
                  >
                    Preview & Use
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); exportJson([t], `policy-template-${t.templateRef ?? t.id}.json`) }}
                    className="text-xs border border-border px-2 py-1 hover:bg-muted"
                    style={{ borderRadius: 0 }}
                  >
                    Export JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preview + Use Template Dialog — renders the REAL template body */}
      <Dialog open={!!useTarget} onOpenChange={open => { if (!open) setUseTarget(null) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" style={{ borderRadius: 0, maxWidth: 640 }}>
          <DialogHeader>
            <DialogTitle>Use Template: {useTarget?.name}</DialogTitle>
          </DialogHeader>
          {useTarget && (
            <div className="space-y-4 py-2">
              <div className="flex gap-2 flex-wrap">
                {useTarget.framework && (
                  <span className="text-xs px-2 py-0.5 font-medium" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' }}>{useTarget.framework}</span>
                )}
                {useTarget.clauseRefs.map(c => (
                  <span key={c} className="text-xs px-2 py-0.5 font-medium" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' }}>{c}</span>
                ))}
                {useTarget.category && (
                  <span className="text-xs px-2 py-0.5 font-medium" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' }}>{useTarget.category}</span>
                )}
              </div>
              {useTarget.description && <p className="text-sm text-muted-foreground">{useTarget.description}</p>}
              <div className="border border-border bg-muted/40 p-3 space-y-3" style={{ borderRadius: 0 }}>
                <p className="text-xs font-semibold text-foreground">Template Content</p>
                {(!body?.summary && sections.length === 0) ? (
                  <p className="text-xs text-muted-foreground">This template has no body content recorded.</p>
                ) : (
                  <>
                    {body?.summary && <p className="text-xs text-muted-foreground leading-relaxed">{body.summary}</p>}
                    {sections.map((s, i) => (
                      <div key={i}>
                        <p className="text-xs font-medium text-foreground">{i + 1}. {s.heading}</p>
                        <p className="text-xs text-muted-foreground pl-3 mt-0.5 whitespace-pre-wrap leading-relaxed">{s.text}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                This creates a real draft policy in your Policy Library{useTarget.category ? <> under <strong>{useTarget.category}</strong></> : null}, with its first version recorded for editing and approval.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setUseTarget(null)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} disabled={instantiate.isPending} onClick={handleAddToLibrary}>
              {instantiate.isPending ? 'Creating…' : 'Add to Policy Library'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
