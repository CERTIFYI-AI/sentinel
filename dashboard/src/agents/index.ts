/**
 * Agent Registry - registers all governance agents with the event bus.
 * Import this file once at app startup.
 */
import { registerAgent, listRegisteredAgents } from '../lib/governance/eventBus'

// ---- MODEL_REGISTERED cascade ----
import { riskAssessmentAgent }       from './riskAssessmentAgent'
import { complianceMapAgent }        from './complianceMapAgent'
import { fairnessScanAgent }         from './fairnessScanAgent'
import { explainabilityAgent }       from './explainabilityAgent'
import { dataGovernanceAgent }       from './dataGovernanceAgent'
import { vendorRiskAgent }           from './vendorRiskAgent'
import { carbonAgent }               from './carbonAgent'
import { hitlAgent }                 from './hitlAgent'
import { cicdGateAgent }             from './cicdGateAgent'
import { knowledgeGraphAgent }       from './knowledgeGraphAgent'
import { notificationAgent }         from './notificationAgent'
import { conformityAssessmentAgent } from './conformityAssessmentAgent'

// ---- RISK_DETECTED cascade ----
import { impactAnalysisAgent }       from './impactAnalysisAgent'
import { autoPauseAgent }            from './autoPauseAgent'
import { remediationPlannerAgent }   from './remediationPlannerAgent'
import { complianceImpactAgent }     from './complianceImpactAgent'
import { narrativeEngineAgent }      from './narrativeEngineAgent'
import { esgAgent }                  from './esgAgent'

// ---- INCIDENT_CREATED cascade ----
import { incidentClassificationAgent } from './incidentClassificationAgent'
import { containmentAgent }            from './containmentAgent'
import { regulatorNotifyAgent }        from './regulatorNotifyAgent'
import { dsrImpactAgent }              from './dsrImpactAgent'
import { vendorCascadeAgent }          from './vendorCascadeAgent'
import { evidenceCollectionAgent }     from './evidenceCollectionAgent'
import { financialImpactAgent }        from './financialImpactAgent'
import { trainingUpdateAgent }         from './trainingUpdateAgent'

// MODEL_REGISTERED → 12 agents
registerAgent('MODEL_REGISTERED', riskAssessmentAgent,       'RiskAssessmentAgent')
registerAgent('MODEL_REGISTERED', complianceMapAgent,        'ComplianceMapAgent')
registerAgent('MODEL_REGISTERED', fairnessScanAgent,         'FairnessScanAgent')
registerAgent('MODEL_REGISTERED', explainabilityAgent,       'ExplainabilityAgent')
registerAgent('MODEL_REGISTERED', dataGovernanceAgent,       'DataGovernanceAgent')
registerAgent('MODEL_REGISTERED', vendorRiskAgent,           'VendorRiskAgent')
registerAgent('MODEL_REGISTERED', carbonAgent,               'CarbonAgent')
registerAgent('MODEL_REGISTERED', hitlAgent,                 'HITLAgent')
registerAgent('MODEL_REGISTERED', cicdGateAgent,             'CICDGateAgent')
registerAgent('MODEL_REGISTERED', knowledgeGraphAgent,       'KnowledgeGraphAgent')
registerAgent('MODEL_REGISTERED', conformityAssessmentAgent, 'ConformityAssessmentAgent')

// RISK_DETECTED / RISK_CREATED → 6 agents
registerAgent('RISK_DETECTED', impactAnalysisAgent,      'ImpactAnalysisAgent')
registerAgent('RISK_CREATED',  impactAnalysisAgent,      'ImpactAnalysisAgent')
registerAgent('RISK_DETECTED', autoPauseAgent,           'AutoPauseAgent')
registerAgent('RISK_DETECTED', remediationPlannerAgent,  'RemediationPlannerAgent')
registerAgent('RISK_CREATED',  remediationPlannerAgent,  'RemediationPlannerAgent')
registerAgent('RISK_DETECTED', complianceImpactAgent,    'ComplianceImpactAgent')
registerAgent('RISK_DETECTED', narrativeEngineAgent,     'NarrativeEngineAgent')
registerAgent('RISK_DETECTED', esgAgent,                 'ESGAgent')
registerAgent('RISK_DETECTED', knowledgeGraphAgent,      'KnowledgeGraphAgent')
registerAgent('RISK_CREATED',  knowledgeGraphAgent,      'KnowledgeGraphAgent')
registerAgent('RISK_DETECTED', evidenceCollectionAgent,  'EvidenceCollectionAgent')
registerAgent('RISK_DETECTED', hitlAgent,                'HITLAgent')

// INCIDENT_CREATED → 8 agents
registerAgent('INCIDENT_CREATED', incidentClassificationAgent, 'IncidentClassificationAgent')
registerAgent('INCIDENT_CREATED', containmentAgent,            'ContainmentAgent')
registerAgent('INCIDENT_CREATED', regulatorNotifyAgent,        'RegulatorNotifyAgent')
registerAgent('INCIDENT_CREATED', dsrImpactAgent,              'DSRImpactAgent')
registerAgent('INCIDENT_CREATED', vendorCascadeAgent,          'VendorCascadeAgent')
registerAgent('INCIDENT_CREATED', evidenceCollectionAgent,     'EvidenceCollectionAgent')
registerAgent('INCIDENT_CREATED', financialImpactAgent,        'FinancialImpactAgent')
registerAgent('INCIDENT_CREATED', narrativeEngineAgent,        'NarrativeEngineAgent')
registerAgent('INCIDENT_CREATED', trainingUpdateAgent,         'TrainingUpdateAgent')

// wildcard notification agent (runs on every event)
registerAgent('*', notificationAgent, 'NotificationAgent')

// Carbon cascade
registerAgent('CARBON_ESTIMATED', esgAgent, 'ESGAgent')
registerAgent('CARBON_BUDGET_EXCEEDED', hitlAgent, 'HITLAgent')

// Vendor-linked cascade
registerAgent('VENDOR_LINKED', knowledgeGraphAgent, 'KnowledgeGraphAgent')

if (typeof window !== 'undefined') {
  // 26 distinct agents; several are registered against more than one event
  // (EvidenceCollection, KnowledgeGraph, HITL, Narrative are cross-cutting),
  // so the registration count is higher than the agent count.
  console.info(`[Sentinel AgentRegistry] ${listRegisteredAgents().length} agent registrations across 26 governance agents`)
}

// re-export for callers
export { emitEvent, subscribeToGovernanceEvents, subscribeToAgentExecutions, listRegisteredAgents } from '../lib/governance/eventBus'
