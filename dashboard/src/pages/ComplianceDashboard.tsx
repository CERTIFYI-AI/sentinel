import React from 'react';
import { useComplianceData } from '../hooks/useComplianceData';
import { FrameworkCard } from '../components/compliance/FrameworkCard';

interface Props {
  tenantId: string;
}

export default function ComplianceDashboard({ tenantId }: Props) {
  const { data, loading, error } = useComplianceData(tenantId);

  if (loading) return <div className="p-6 text-gray-500">Loading compliance data...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sentinel provides evidence — not a legal opinion. PASS requires a specific signal value.
          FAIL includes remediation. N/A indicates organisational process required.
        </p>
        <p className="text-xs text-gray-400 mt-1">Last updated: {new Date(data.last_updated).toLocaleString()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.frameworks.map((fw) => (
          <FrameworkCard key={fw.framework_id} result={fw} />
        ))}
      </div>
    </div>
  );
}
