import { useState, useEffect } from "react";

export interface Policy {
  id: string;
  title: string;
  framework: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
  body: string;
  is_system: boolean;
}

export function usePolicies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/policies")
      .then(r => r.json())
      .then(data => { setPolicies(data.items || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  return { policies, loading, error };
}

export function useTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/v1/policies/templates')
      .then(r => r.json())
      .then(data => { setTemplates(data.items || data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { templates, loading };
}

export function useComplianceScore() {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/v1/policies/compliance-scores')
      .then(r => r.json())
      .then(data => { setScores(data.items || data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { scores, loading };
}
