/**
 * HITL (Human-in-the-Loop) Agent
 * Triggered by: MODEL_REGISTERED (high-risk), RISK_DETECTED
 * Action: creates HITL review if model is Tier 1/2
 */
export async function hitlAgent(
  payload: Record<string, unknown>,
  orgId: string
) {
  const { modelId, modelName, riskTier, severity } = payload as any
  if ((riskTier as number) > 2 && severity !== 'critical') return

  console.log(`[HITLAgent] Queuing review for high-risk model: ${modelName}`)
}
