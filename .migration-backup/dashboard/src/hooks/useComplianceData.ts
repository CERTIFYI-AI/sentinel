// @ts-nocheck
import { useState, useEffect } from 'react';
import type { ComplianceDashboardData } from '../lib/compliance-types';

interface UseComplianceDataResult {
  data: ComplianceDashboardData | null;
  loading: boolean;
  error: string | null;
}

export function useComplianceData(tenantId: string): UseComplianceDataResult {
  const [data, setData] = useState<ComplianceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/compliance/dashboard/${tenantId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e.message));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tenantId]);

  return { data, loading, error };
}
