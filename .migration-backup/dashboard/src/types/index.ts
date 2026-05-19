// Re-export all types
export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './database';

// Convenience aliases used across the app
export type OrgId = string;
export type UserId = string;

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

export interface MutationResult<T = unknown> {
  data: T | null;
  error: ApiError | null;
}

export type RiskSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type ComplianceStatus = 'Compliant' | 'Non-Compliant' | 'Partial' | 'Not Assessed';
export type ModelStatus = 'Active' | 'Draft' | 'Retired' | 'Under Review';
export type IncidentSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type UserRole = 'admin' | 'ciso' | 'analyst' | 'auditor' | 'viewer';
