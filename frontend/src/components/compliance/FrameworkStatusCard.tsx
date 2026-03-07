import React from 'react';

interface FrameworkStatusCardProps {
  framework: {
    framework_id: string;
    display_name: string;
    legal_weight: string;
    compliance_score: number;
    controls_passed: number;
    controls_failed: number;
    controls_na: number;
    controls: any[];
  };
  legalWeightColor: string;
  onControlClick: (control: any) => void;
}

export const FrameworkStatusCard: React.FC<FrameworkStatusCardProps> = ({
  framework,
  legalWeightColor,
  onControlClick,
}) => {
  const total = framework.controls_passed + framework.controls_failed + framework.controls_na;
  const legalLabel = framework.legal_weight === 'mandatory-law' ? 'MANDATORY LAW' :
    framework.legal_weight === 'best-practice' ? 'BEST PRACTICE' : 'VOLUNTARY';

  return (
    <div className="framework-card" style={{ borderLeftColor: legalWeightColor }}>
      <div className="framework-header">
        <h3>{framework.display_name}</h3>
        <span className="legal-badge" style={{ backgroundColor: legalWeightColor, color: '#fff' }}>
          {legalLabel}
        </span>
      </div>
      <div className="framework-score">
        <div className="score-circle" style={{ '--score': framework.compliance_score } as React.CSSProperties}>
          {framework.compliance_score}%
        </div>
      </div>
      <div className="framework-controls-summary">
        <span className="pass">{framework.controls_passed} passed</span>
        <span className="fail">{framework.controls_failed} failed</span>
        <span className="na">{framework.controls_na} N/A</span>
        <span className="total">{total} total</span>
      </div>
      <div className="framework-controls-list">
        {framework.controls.map(c => (
          <button
            key={c.control_id}
            className={"control-pill control-" + c.status.toLowerCase()}
            onClick={() => onControlClick(c)}
            title={c.title}
          >
            {c.control_id}
          </button>
        ))}
      </div>
    </div>
  );
};
