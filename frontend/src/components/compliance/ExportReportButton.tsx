import React, { useState } from 'react';

export const ExportReportButton: React.FC = () => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/compliance/report/export', { method: 'POST' });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compliance-report-' + new Date().toISOString().split('T')[0] + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      className="export-report-btn"
      onClick={handleExport}
      disabled={exporting}
    >
      {exporting ? 'Exporting...' : 'Export Report'}
    </button>
  );
};
