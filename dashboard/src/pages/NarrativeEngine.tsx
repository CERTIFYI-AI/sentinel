// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Narrative Engine — audience-shaped governance narrative composed from the
// real registers.
//
// This page previously served a hardcoded narrative asserting a bias violation
// ("Demographic Parity Difference: 0.12 (threshold: 0.10 — VIOLATION)") that no
// bias audit had produced, against a model code ("MDL-001") that does not exist
// in the registry, and offered it as regulator-facing output. It also showed a
// fabricated approval history (NAR-018..021 with named approvers) and a
// "calibration" panel claiming "14 months of approved narratives" and "style
// drift < 2%" — none of which was computed from anything.
//
// Every figure now comes from governanceFactsService, which counts real rows
// and returns null rather than 0 when a table cannot be read. The citation
// panel shows the source query behind each number, so the person who signs the
// narrative can check it rather than trust it.

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Brain, Download, Warning, CheckCircle, Copy } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableSkeleton, ErrorState } from '@/components/evals/states'
import { useSettingsStore } from '@/stores/settingsStore'
import { fetchGovernanceFacts } from '@/services/governanceFactsService'
import {
  composeNarrative, NARRATIVE_AUDIENCES, AUDIENCE_LABEL, type NarrativeAudience,
} from '@/services/narrativeComposer'

export default function NarrativeEngine() {
  const { orgName } = useSettingsStore()
  const [audience, setAudience] = useState<NarrativeAudience>('board')
  const [edited, setEdited] = useState<string | null>(null)

  const { data: facts, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['governance-facts'],
    queryFn: fetchGovernanceFacts,
    staleTime: 60_000,
  })

  const narrative = useMemo(
    () => (facts ? composeNarrative(audience, facts, orgName || 'This organisation') : null),
    [facts, audience, orgName],
  )

  // The edit buffer is per-audience: switching audience discards an unsaved
  // edit rather than silently carrying board prose into a regulator document.
  const body = edited ?? narrative?.body ?? ''

  function changeAudience(a: NarrativeAudience) {
    setAudience(a)
    setEdited(null)
  }

  function download() {
    if (!narrative) return
    const doc = [
      narrative.title,
      '='.repeat(narrative.title.length),
      '',
      body,
      '',
      '--- Figures used in this narrative ---',
      ...narrative.citations.map((c) => `${c.label}: ${c.value}   [${c.source}]`),
      '',
      `Generated ${new Date().toISOString()} from the Sentinel governance registers.`,
      narrative.incomplete
        ? 'INCOMPLETE: one or more figures could not be read and are shown as "not measured".'
        : 'All figures were read successfully at generation time.',
    ].join('\n')
    const blob = new Blob([doc], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${audience}-narrative-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success('Narrative downloaded with its figure sources')
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(body)
      toast.success('Narrative copied')
    } catch {
      toast.error('Could not copy — the browser refused clipboard access')
    }
  }

  return (
    <div>
      <PageHeader
        title="Narrative Engine"
        subtitle="Governance narrative composed from the live registers — every figure traceable to the record it came from"
        icon={Brain}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => refetch()} loading={isFetching}>
              Re-read registers
            </Button>
            <Button variant="secondary" size="sm" icon={<Copy />} onClick={copy} disabled={!narrative}>
              Copy
            </Button>
            <Button size="sm" icon={<Download />} onClick={download} disabled={!narrative}>
              Download
            </Button>
          </div>
        }
      />

      {isLoading ? <TableSkeleton cols={2} />
        : error ? <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
        : !narrative ? null : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={audience} onValueChange={(a) => changeAudience(a as NarrativeAudience)}>
                    <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NARRATIVE_AUDIENCES.map((a) => (
                        <SelectItem key={a} value={a}>{AUDIENCE_LABEL[a]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="font-mono text-[11px] text-[hsl(var(--text-4))]">
                    {narrative.wordCount} words · read {new Date(facts!.measuredAt).toLocaleString()}
                  </span>
                  {edited !== null && (
                    <button className="text-[11px] text-[hsl(var(--brand))] hover:underline"
                      onClick={() => setEdited(null)}>
                      revert to generated
                    </button>
                  )}
                </div>

                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{narrative.title}</h2>

                {narrative.incomplete && (
                  <div className="flex gap-2 border border-[hsl(var(--s-wn-br))] bg-[hsl(var(--s-wn-bg))] p-3">
                    <Warning size={16} className="mt-0.5 shrink-0 text-[hsl(var(--s-wn-tx))]" />
                    <p className="text-xs text-[hsl(var(--text-2))]">
                      One or more figures could not be read from the governance database and
                      appear as <strong>not measured</strong>. They are unknown, not zero — this
                      narrative should not be submitted until they resolve.
                    </p>
                  </div>
                )}

                <Textarea
                  rows={22}
                  value={body}
                  onChange={(e) => setEdited(e.target.value)}
                  className="font-mono text-[12px] leading-relaxed"
                />
                <p className="text-[11px] text-[hsl(var(--text-4))]">
                  Edits are yours and are not saved to the platform. The download always carries
                  the figure sources below, so a reader can verify each number against the register
                  it came from.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <h3 className="mb-1 text-sm font-semibold text-[hsl(var(--text-1))]">
                Figures used
              </h3>
              <p className="mb-3 text-[11px] text-[hsl(var(--text-4))]">
                Each number in the narrative, and the query behind it.
              </p>
              <ul className="space-y-2">
                {narrative.citations.map((c) => {
                  const unread = c.value === 'not measured'
                  return (
                    <li key={c.label} className="border-b border-[hsl(var(--border))] pb-2 last:border-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs text-[hsl(var(--text-2))]">{c.label}</span>
                        <span className="font-mono text-xs font-semibold"
                          style={{ color: unread ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' }}>
                          {c.value}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-[hsl(var(--text-4))]">
                        {c.source}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {!narrative.incomplete && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[hsl(var(--s-ok-tx))]">
                  <CheckCircle size={12} /> All figures read successfully.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
