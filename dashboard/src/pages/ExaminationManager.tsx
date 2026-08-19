import { Card, CardContent } from '../components/ui/card';
import { PageHeader } from '../components/ui/PageHeader';
import { Gavel } from '@phosphor-icons/react';
import { useOrgName } from '../hooks/useOrganization';

/*
  The Regulatory Examination Manager presented four hardcoded examinations as
  this organisation's live regulatory position — a Federal Reserve SR 11-7
  review and an OCC AI/ML examination among them, each with literal counts
  (openFindings: 2, docRequests: 18, docFulfilled: 14) that drove the KPI strip
  above the table. A reader had no way to tell that none of it described them.

  Two buttons also reported success for writes that never happened:
  "Register Examination" fired toast.success('New examination registered') and
  registered nothing, and the document-request dialog fired
  toast.success('Response submitted for …') while persisting nothing. A
  regulatory response the product says it submitted, and did not, is the worst
  version of that defect — so both are gone rather than relabelled.

  There is no examinations table, service or hook behind this route. The module
  says so until one exists.
*/
export default function ExaminationManager() {
  const orgName = useOrgName();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Regulatory Examination Manager"
        subtitle={`${orgName} · Examination tracking, document requests and findings`}
      />

      <Card style={{ borderRadius: 0 }}>
        <CardContent className="p-8 text-center">
          <Gavel size={28} style={{ color: 'hsl(var(--text-4))' }} className="mx-auto mb-3" />
          <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
            No examinations are being tracked
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm" style={{ color: 'hsl(var(--text-3))' }}>
            Examination tracking needs a record store for examinations, document
            requests and findings, which is not yet available. No examinations,
            request counts or findings are shown here, and nothing on this page
            describes your regulatory position.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            Evidence you would produce for an examiner is live today in Evidence
            Vault, and open findings are tracked in the Risk Register — both
            computed from your own records.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
