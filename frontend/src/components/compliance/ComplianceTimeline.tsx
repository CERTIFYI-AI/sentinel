import React, { useEffect, useState } from 'react';

interface TimelineEntry {
  timestamp: string;
  compliance_score: number;
  framework_scores: Record<string, number>;
}

export const ComplianceTimeline: React.FC = () => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    fetch('/api/compliance/timeline')
      .then(res => res.json())
      .then(setEntries)
      .catch(() => {});
  }, []);

  if (entries.length === 0) {
    return (
      <div className="compliance-timeline">
        <h2>Compliance Score Timeline</h2>
        <p className="no-data">No historical data available yet. Scores will appear after the first evaluation cycle.</p>
      </div>
    );
  }

  const maxScore = 100;
  const chartHeight = 200;

  return (
    <div className="compliance-timeline">
      <h2>Compliance Score Timeline</h2>
      <div className="timeline-chart" style={{ height: chartHeight }}>
        <svg width="100%" height={chartHeight} viewBox={"0 0 " + (entries.length * 60) + " " + chartHeight}>
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            points={entries.map((e, i) =>
              (i * 60 + 30) + ',' + (chartHeight - (e.compliance_score / maxScore) * chartHeight)
            ).join(' ')}
          />
          {entries.map((e, i) => (
            <circle
              key={i}
              cx={i * 60 + 30}
              cy={chartHeight - (e.compliance_score / maxScore) * chartHeight}
              r="4"
              fill="#2563eb"
            >
              <title>{e.timestamp}: {e.compliance_score}%</title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
};
