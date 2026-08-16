/**
 * Agentic Mesh — the continuous sentinel fleet.
 *
 * 10 always-on governance agents. Names must match the agent_registry seed
 * in supabase/migrations/20260816_agentic_mesh_fleet.sql — the registry row
 * is the catalog (copy, interval, targets); these are the implementations.
 */
import type { SentinelDefinition } from './types'
import { policyEnforcementSweep } from './policyEnforcement'
import { driftDetectionSweep } from './driftDetection'
import { biasMonitorSweep } from './biasMonitor'
import { dataLineageSweep } from './dataLineage'
import { incidentTriageSweep } from './incidentTriage'
import { complianceCheckSweep } from './complianceCheck'
import { accessAuditSweep } from './accessAudit'
import { explainabilitySweep } from './explainability'
import { changeDetectionSweep } from './changeDetection'
import { reportingSweep } from './reporting'

export const SENTINELS: SentinelDefinition[] = [
  { name: 'PolicyEnforcement', run: policyEnforcementSweep },
  { name: 'DriftDetection', run: driftDetectionSweep },
  { name: 'BiasMonitor', run: biasMonitorSweep },
  { name: 'DataLineage', run: dataLineageSweep },
  { name: 'IncidentTriage', run: incidentTriageSweep },
  { name: 'ComplianceCheck', run: complianceCheckSweep },
  { name: 'AccessAudit', run: accessAuditSweep },
  { name: 'Explainability', run: explainabilitySweep },
  { name: 'ChangeDetection', run: changeDetectionSweep },
  { name: 'Reporting', run: reportingSweep },
]

export const SENTINEL_NAMES = SENTINELS.map((s) => s.name)

export type { SentinelDefinition, SentinelResult, SentinelFinding, SentinelContext } from './types'
