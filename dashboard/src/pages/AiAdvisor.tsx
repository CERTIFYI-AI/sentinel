import { Brain } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'

/*
  The AI Governance Advisor was a mock end to end, behind a "Simulation" banner
  that did not cover what it actually did.

  What stood here:
  - Eight hardcoded "findings" carrying specific invented measurements —
    "18.3% disparity in approval rates between male and female applicants",
    "accuracy dropped from 87.4% to 71.2%", "currently 43% complete" — each
    naming a model as though it had been assessed.
  - A chat whose every answer was keyword-matched canned text asserting figures
    about the reader's own organisation: "Overall EU AI Act readiness: 67%",
    "Overall risk level: ELEVATED (Score: 7.2/10)", "MTTR this month: 4.2
    hours", plus named incident IDs (INC-2026-034) that exist nowhere.
  - A "Take action" button that fired toast.success('Action queued', 'Task
    created: …') and created nothing. A success toast for a write that never
    happened is the one thing the platform rules prohibit outright, and no
    banner makes it honest.

  There is no advisor pipeline: no service, no hook, no table, and no model
  call anywhere behind this route. So the module says that, rather than
  simulating a product that does not exist. The governance data the advisor
  claimed to read is real and already reachable — the links below go to it.
*/
export default function AiAdvisor() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Governance Advisor"
        subtitle="Sentinel AI Co-Pilot"
        icon={Brain}
      />

      <Card style={{ borderRadius: 0 }}>
        <CardContent className="p-8 text-center">
          <Brain size={28} style={{ color: 'hsl(var(--text-4))' }} className="mx-auto mb-3" />
          <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            The governance advisor is not connected
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm" style={{ color: 'hsl(var(--text-3))' }}>
            Advisory findings require a model that reads your governed inventory
            and a pipeline to persist what it recommends. Neither is configured
            yet, so no findings, scores or readiness percentages are shown here.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            The underlying data is live today: see Risk Register for open risks,
            Bias Audits for fairness findings, Incident Log for active incidents,
            and Evidence Vault for audit readiness — each computed from your own
            records.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
