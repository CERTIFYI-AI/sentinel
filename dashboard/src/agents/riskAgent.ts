import { risksApi } from '@/api/risks';

export async function riskAgent(payload: any): Promise<void> {
  const { modelId, modelName, riskTier } = payload;
  if (!modelId) return;

  const risk = {
    title: `Auto Risk: ${modelName} — Initial Assessment`,
    description: `Automated risk assessment created for model ${modelName} (Tier ${riskTier})`,
    category: 'AI Model Risk',
    likelihood: riskTier <= 2 ? 4 : 2,
    impact: riskTier <= 2 ? 4 : 2,
    status: 'open',
    source: 'auto',
    auto_generated: true,
    model_id: modelId,
    treatment: riskTier <= 2 ? 'mitigate' : 'accept',
  };

  await risksApi.create(risk);
  console.log(`[RiskAgent] Created risk for ${modelName}`);
}
