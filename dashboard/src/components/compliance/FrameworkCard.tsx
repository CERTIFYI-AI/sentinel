import React, { useState } from 'react';
import type { FrameworkAuditResult } from '../../lib/compliance-types';
import { LegalWeightBadge } from './LegalWeightBadge';
import { ControlStatusBadge } from './ControlStatusBadge';
import { ComplianceScoreGauge } from './ComplianceScoreGauge';

interface Props {
  result: FrameworkAuditResult;
}

export function FrameworkCard({ result }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-none border border-border shadow-sm p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground">{result.display_name}</h3>
            <LegalWeightBadge weight={result.legal_weight} />
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="text-green-700 font-medium">{result.pass_count} PASS</span>
            <span className="text-red-700 font-medium">{result.fail_count} FAIL</span>
            <span className="text-muted-foreground">{result.na_count} N/A</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Score denominator: {result.total_in_scope} in-scope controls
          </p>
        </div>
        <ComplianceScoreGauge score={result.score_pct} label="Score" />
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-emerald-600 hover:text-blue-800 font-medium"
      >
        {expanded ? 'Hide controls' : 'Show controls'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {result.controls.map((ctrl) => (
            <div key={ctrl.control_id} className="flex items-start gap-2 p-2 bg-muted rounded text-xs">
              <ControlStatusBadge status={ctrl.status} />
              <div className="flex-1">
                <span className="font-mono text-foreground">{ctrl.control_id}</span>
                {ctrl.status === 'fail' && ctrl.remediation && (
                  <p className="text-red-600 mt-0.5">{ctrl.remediation}</p>
                )}
                {ctrl.status === 'na' && ctrl.scope_note && (
                  <p className="text-muted-foreground mt-0.5 italic">{ctrl.scope_note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
