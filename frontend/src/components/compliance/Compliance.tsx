import React, { useEffect, useState } from 'react';
import { FrameworkStatusCard } from './FrameworkStatusCard';
import { ControlHeatmap } from './ControlHeatmap';
import { ComplianceTimeline } from './ComplianceTimeline';
import { ControlDetailDrawer } from './ControlDetailDrawer';
import { ExportReportButton } from './ExportReportButton';

interface ComplianceData {
  summary: {
    total_frameworks: number;
    compliance_score: number;
    passed: number;
    failed: number;
    not_applicable: number;
  };
  frameworks: FrameworkResult[];
}

interface FrameworkResult {
  framework_id: string;
  display_name: string;
  legal_weight: string;
  compliance_score: number;
  controls_passed: number;
  controls_failed: number;
  controls_na: number;
  controls: ControlResult[];
}

interface ControlResult {
  control_id: string;
  title: string;
  status: string;
  category: string;
  signal_source: string;
  signal_value: any;
  threshold: string | null;
  remediation: string | null;
  scope_note: string | null;
}

const LEGAL_WEIGHT_COLORS: Record<string, string> = {
  'mandatory-law': '#dc2626',
  'best-practice': '#2563eb',
  'voluntary': '#6b7280',
};

export const Compliance: React.FC = () => {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [selectedControl, setSelectedControl] = useState<ControlResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/compliance/report')
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="compliance-loading">Loading compliance data...</div>;

  return (
    <div className="compliance-dashboard">
      <header className="compliance-header">
        <h1>AI Compliance Dashboard</h1>
        <div className="compliance-score-badge">
          <span className="score">{data.summary.compliance_score}%</span>
          <span className="label">Overall Score</span>
        </div>
        <ExportReportButton />
      </header>
      <div className="compliance-summary">
        <div className="stat"><span className="value">{data.summary.passed}</span><span className="label">Passed</span></div>
        <div className="stat"><span className="value">{data.summary.failed}</span><span className="label">Failed</span></div>
        <div className="stat"><span className="value">{data.summary.not_applicable}</span><span className="label">N/A</span></div>
      </div>
      <div className="compliance-frameworks">
        {data.frameworks.map(fw => (
          <FrameworkStatusCard
            key={fw.framework_id}
            framework={fw}
            legalWeightColor={LEGAL_WEIGHT_COLORS[fw.legal_weight] || '#6b7280'}
            onControlClick={setSelectedControl}
          />
        ))}
      </div>
      <ControlHeatmap frameworks={data.frameworks} />
      <ComplianceTimeline />
      {selectedControl && (
        <ControlDetailDrawer
          control={selectedControl}
          onClose={() => setSelectedControl(null)}
        />
      )}
    </div>
  );
};

export default Compliance;
