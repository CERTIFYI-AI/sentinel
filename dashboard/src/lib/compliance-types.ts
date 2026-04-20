
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

export interface ComplianceFramework {
  id: string;
  name: string;
  status: string;
  score: number;
  controls_total: number;
  controls_passing: number;
}

export interface ControlItem {
  id: string;
  control_id: string;
  title: string;
  status: 'passing' | 'failing' | 'not_tested' | 'not_applicable';
  severity: 'critical' | 'high' | 'medium' | 'low';
  framework: string;
  description?: string;
  owner?: string;
  last_tested?: string;
}

export interface RiskItem {
  id: string;
  title: string;
  description?: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  status: 'open' | 'mitigated' | 'accepted' | 'closed';
  category: string;
  owner?: string;
  created_at: string;
}

export interface PolicyItem {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'archived' | 'under_review';
  category: string;
  version: string;
  owner?: string;
  last_reviewed?: string;
  created_at: string;
}
