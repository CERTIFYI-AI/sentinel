import { Card, CardContent } from '../components/ui/card';
import { PageHeader } from '../components/ui/PageHeader';
import { Users } from '@phosphor-icons/react';
import { useOrgName } from '../hooks/useOrganization';

/*
  Peer benchmarking compares your posture against data contributed by other
  organisations. No such pipeline exists: there is no opt-in mechanism, no
  contribution table, no anonymisation step and no peer cohort anywhere in the
  codebase. So the module says so, rather than showing figures.

  What stood here asserted the opposite, in writing, to paying customers --
  "powered by 47 financial services peers", "All peer data fully anonymized -
  Zero PII shared", and "This proprietary dataset, built exclusively from
  Sentinel clients, cannot be replicated by any alternative platform" -- all of
  it backed by four hardcoded arrays. That is a fabricated product claim rather
  than a fabricated metric, so it is removed, not relabelled.

  An "illustrative preview" toggle survived that first pass and kept the four
  arrays alive behind it, including invented ROI figures ("$240K risk
  reduction"). Labelling invented money as illustrative does not make it fit to
  ship, so the arrays and the toggle are now gone too.
*/
export default function PeerIntelligence() {
  const orgName = useOrgName();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Peer Benchmarking"
        subtitle={`${orgName} · Cross-sector AI risk benchmarking`}
      />

      <Card style={{ borderRadius: 0 }}>
        <CardContent className="p-8 text-center">
          <Users size={28} style={{ color: 'hsl(var(--text-4))' }} className="mx-auto mb-3" />
          <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            Peer benchmarking is not active for this organisation
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm" style={{ color: 'hsl(var(--text-3))' }}>
            Benchmarking requires an opt-in contribution pipeline across
            organisations, which is not yet available. No peer figures,
            percentiles or rankings are shown here, and nothing on this page is
            derived from real peer data.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            Your own posture is available today on the CISO Dashboard and on
            Benchmarking &amp; Maturity, both computed from your governed inventory.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
