// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// TemplateLibrary — the TPRM questionnaire packs, grouped by product module.
// "Run" picks a vendor and deep-links to that vendor's questionnaire with the
// pack preselected (?template=<slug>). Data: vendor_assessment_templates.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardText, Play } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { useAssessmentTemplates, type AssessmentTemplate } from '@/hooks/queries/useAssessmentTemplates'
import { useVendorOptions } from '@/hooks/useVendorsData'

export function TemplateLibrary() {
  const navigate = useNavigate()
  const templates = useAssessmentTemplates()
  const { options: vendors } = useVendorOptions()
  const [runFor, setRunFor] = useState<AssessmentTemplate | null>(null)
  const [vendorId, setVendorId] = useState('')

  const byModule = new Map<string, AssessmentTemplate[]>()
  for (const t of templates.data ?? []) {
    byModule.set(t.module, [...(byModule.get(t.module) ?? []), t])
  }

  return (
    <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <ClipboardText size={16} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Questionnaire packs</h2>
          {templates.data && (
            <Badge style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 10 }}>
              {templates.data.length}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
          Built-in assessment instruments grouped by TPRM module. Running a pack opens it against
          the vendor you pick; responses store the pack version and score snapshot.
        </p>

        {templates.isLoading ? (
          <p className="mt-4 text-xs" style={{ color: 'hsl(var(--text-4))' }}>Loading packs…</p>
        ) : templates.isError ? (
          <p className="mt-4 text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>
            Packs failed to load: {(templates.error as Error)?.message}
          </p>
        ) : (templates.data ?? []).length === 0 ? (
          <p className="mt-4 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            No questionnaire packs available for this organisation yet.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {Array.from(byModule.entries()).map(([module, packs]) => (
              <div key={module}>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>
                  {module}
                </p>
                <div className="space-y-1">
                  {packs.map((t) => (
                    <div key={t.slug} className="flex items-center justify-between gap-3 px-3 py-2"
                      style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-surface))' }}>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>
                          {t.name}
                          <span className="ml-2 font-normal" style={{ color: 'hsl(var(--text-4))' }}>
                            {t.version} · {t.questions.length} questions
                          </span>
                        </p>
                        {t.description && (
                          <p className="text-[11px] truncate" style={{ color: 'hsl(var(--text-4))' }} title={t.description}>
                            {t.description}
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0"
                        onClick={() => { setRunFor(t); setVendorId('') }}>
                        <Play size={12} /> Run
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Vendor picker — running a pack needs a vendor to run it against */}
      <FormDialog
        open={!!runFor}
        onOpenChange={(o) => { if (!o) setRunFor(null) }}
        title={runFor ? `Run ${runFor.name}` : 'Run assessment'}
        description="The questionnaire opens against the vendor you pick; the response is stored on that vendor's record."
        submitLabel="Open questionnaire"
        disabled={!vendorId}
        onSubmit={() => {
          if (!runFor || !vendorId) return
          navigate(`/vendors/${vendorId}/questionnaire?template=${runFor.slug}`)
        }}
      >
        <Field label="Vendor" required>
          <Select value={vendorId || undefined} onValueChange={setVendorId}>
            <SelectTrigger><SelectValue placeholder={vendors.length === 0 ? 'No vendors in the registry' : 'Select vendor…'} /></SelectTrigger>
            <SelectContent>
              {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </FormDialog>
    </Card>
  )
}
