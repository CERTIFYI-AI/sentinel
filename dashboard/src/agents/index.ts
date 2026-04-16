/**
 * Agent Registry - Maps governance event types to agent handler functions.
 * Registers all agents with the governance event bus on import.
 */
import { registerAgent } from '../lib/governance/eventBus'
import { riskAssessmentAgent } from './riskAssessmentAgent'
import { complianceMapAgent } from './complianceMapAgent'
import { hitlAgent } from './hitlAgent'
import { vendorRiskAgent } from './vendorRiskAgent'
import { carbonAgent } from './carbonAgent'
import { dataGovernanceAgent } from './dataGovernanceAgent'

// Register agents for MODEL_REGISTERED events
registerAgent('MODEL_REGISTERED', riskAssessmentAgent)
registerAgent('MODEL_REGISTERED', complianceMapAgent)
registerAgent('MODEL_REGISTERED', hitlAgent)
registerAgent('MODEL_REGISTERED', vendorRiskAgent)
registerAgent('MODEL_REGISTERED', carbonAgent)
registerAgent('MODEL_REGISTERED', dataGovernanceAgent)

// Register agents for RISK_DETECTED events
registerAgent('RISK_DETECTED', complianceMapAgent)
registerAgent('RISK_DETECTED', hitlAgent)

console.log('[AgentRegistry] 6 governance agents registered')

export {
  riskAssessmentAgent,
  complianceMapAgent,
  hitlAgent,
  vendorRiskAgent,
  carbonAgent,
  dataGovernanceAgent,
}
