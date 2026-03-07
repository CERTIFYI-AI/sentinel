import React from 'react';

interface ControlHeatmapProps {
  frameworks: Array<{
    framework_id: string;
    display_name: string;
    controls: Array<{
      control_id: string;
      status: string;
      category: string;
    }>;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  PASS: '#22c55e',
  FAIL: '#ef4444',
  NA: '#9ca3af',
  UNKNOWN: '#fbbf24',
};

export const ControlHeatmap: React.FC<ControlHeatmapProps> = ({ frameworks }) => {
  return (
    <div className="control-heatmap">
      <h2>Control Status Heatmap</h2>
      <div className="heatmap-grid">
        {frameworks.map(fw => (
          <div key={fw.framework_id} className="heatmap-row">
            <div className="heatmap-label">{fw.display_name}</div>
            <div className="heatmap-cells">
              {fw.controls.map(c => (
                <div
                  key={c.control_id}
                  className="heatmap-cell"
                  style={{ backgroundColor: STATUS_COLORS[c.status] || STATUS_COLORS.UNKNOWN }}
                  title={c.control_id + ': ' + c.status}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: color }} />
            <span>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
