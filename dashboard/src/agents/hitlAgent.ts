import { hitlApi } from '@/api/hitl';

export async function hitlAgent(payload: any): Promise<void> {
  const { modelId, modelName, riskTier } = payload;
  if (!modelId || (riskTier && riskTier > 2)) return;

  await hitlApi.create({
    entity_type: 'model',
    entity_id: modelId,
    entity_name: modelName,
    trigger_reason: `High-risk model Tier ${riskTier} — EU AI Act Art.14 oversight required`,
    priority: 'high',
    status: 'pending',
    auto_generated: true,
    sla_deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
  });
  console.log(`[HITLAgent] Created HITL review for ${modelName}`);
}
