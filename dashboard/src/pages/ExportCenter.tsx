// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Export Center — produces real files from the real registers.
//
// The page previously listed hardcoded templates beside a fake "recent jobs"
// table showing completed exports with sizes and timestamps. None had ever run
// and nothing was ever produced.
//
// Every card below runs a real query and downloads a real CSV with ids resolved
// to names, and reports the row count it actually wrote. The session list shows
// only exports run in this session — it is not a persisted job history, and it
// says so rather than implying one exists.

import { useState } from 'react'
import { toast } from 'sonner'
import { DownloadSimple, FileArrowDown, Warning } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EXPORTS, runExport } from '@/services/exportService'
import { useRBAC } from '@/hooks/useRBAC'

interface SessionExport {
  name: string
  filename: string
  rows: number
  at: string
}

export default function ExportCenter() {
  const { can } = useRBAC()
  const [running, setRunning] = useState<string | null>(null)
  const [done, setDone] = useState<SessionExport[]>([])

  async function handleRun(key: string, name: string) {
    setRunning(key)
    try {
      const r = await runExport(key)
      setDone((d) => [
        { name, filename: r.filename, rows: r.rows, at: new Date().toLocaleTimeString() },
        ...d,
      ])
      toast.success(
        r.rows === 0
          ? `${name}: register is empty — exported headers only`
          : `${name}: ${r.rows} row${r.rows === 1 ? '' : 's'} exported`,
      )
    } catch (e: any) {
      toast.error(e?.message ?? `${name} export failed`)
    } finally {
      setRunning(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Export Center"
        subtitle="Regulator-readable extracts of the governance registers — ids resolved to names, row counts reported"
        icon={DownloadSimple}
      />

      <Card className="mb-4">
        <CardContent className="flex gap-2 p-4">
          <Warning size={16} className="mt-0.5 shrink-0 text-[hsl(var(--text-4))]" />
          <p className="text-xs text-[hsl(var(--text-3))]">
            Each export runs against the live registers at the moment you click it, and every
            foreign key is resolved to the name it points at — an id that resolves to nothing is
            written as <span className="font-mono">Unavailable</span> rather than left as a raw key.
            An empty register exports as a header row and reports zero, which is a real answer
            rather than a failure. Exports are recorded in the audit trail.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {EXPORTS.map((e) => (
          <Card key={e.key} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{e.name}</h3>
              <p className="text-xs text-[hsl(var(--text-3))]">{e.description}</p>
              <p className="mt-auto pt-2 text-[11px] italic text-[hsl(var(--text-4))]">{e.basis}</p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2 w-full"
                icon={<FileArrowDown />}
                loading={running === e.key}
                disabled={!!running || !can('read')}
                onClick={() => handleRun(e.key, e.name)}
              >
                Export CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">This session</h3>
          <p className="mb-3 text-[11px] text-[hsl(var(--text-4))]">
            Exports you have run since the page loaded. This is not a persisted job history —
            the platform does not keep one, and this list is empty again on reload. The audit
            trail is the durable record.
          </p>
          {done.length === 0 ? (
            <p className="text-xs text-[hsl(var(--text-4))]">Nothing exported yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {done.map((d, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 border-b border-[hsl(var(--border))] pb-1.5 last:border-0">
                  <span className="text-xs text-[hsl(var(--text-2))]">{d.name}</span>
                  <span className="font-mono text-[11px] text-[hsl(var(--text-4))]">
                    {d.rows === 0 ? 'empty' : `${d.rows} rows`} · {d.filename} · {d.at}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
