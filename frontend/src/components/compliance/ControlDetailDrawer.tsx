import React from 'react';

interface ControlDetailDrawerProps {
  control: {
    control_id: string;
    title: string;
    status: string;
    category: string;
    signal_source: string;
    signal_value: any;
    threshold: string | null;
    remediation: string | null;
    scope_note: string | null;
  };
  onClose: () => void;
}

export const ControlDetailDrawer: React.FC<ControlDetailDrawerProps> = ({ control, onClose }) => {
  const statusClass = 'status-' + control.status.toLowerCase();

  return (
    <div className="control-drawer-overlay" onClick={onClose}>
      <div className="control-drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>{control.control_id}: {control.title}</h3>
          <button className="drawer-close" onClick={onClose}>x</button>
        </div>
        <div className="drawer-body">
          <div className="drawer-field">
            <label>Status</label>
            <span className={statusClass}>{control.status}</span>
          </div>
          <div className="drawer-field">
            <label>Category</label>
            <span>{control.category}</span>
          </div>
          <div className="drawer-field">
            <label>Signal Source</label>
            <span>{control.signal_source || 'N/A'}</span>
          </div>
          <div className="drawer-field">
            <label>Signal Value</label>
            <span>{control.signal_value !== null ? String(control.signal_value) : 'N/A'}</span>
          </div>
          {control.threshold && (
            <div className="drawer-field">
              <label>Threshold</label>
              <span>{control.threshold}</span>
            </div>
          )}
          {control.remediation && (
            <div className="drawer-field remediation">
              <label>Remediation Required</label>
              <p>{control.remediation}</p>
            </div>
          )}
          {control.scope_note && (
            <div className="drawer-field scope-note">
              <label>Scope Note (N/A Reason)</label>
              <p>{control.scope_note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
