import { notificationsApi } from '@/api/notifications';

export async function complianceAgent(payload: any): Promise<void> {
  const { modelName, riskTier } = payload;
  const gaps: string[] = [];

  if (riskTier && riskTier <= 2) {
    gaps.push('EU AI Act Art.27 — AI Impact Assessment required');
    gaps.push('EU AI Act Art.10 — Bias audit required');
    gaps.push('EU AI Act Art.13 — Transparency documentation required');
  }

  if (gaps.length > 0) {
    await notificationsApi.create({
      title: `${gaps.length} compliance gaps detected for ${modelName}`,
      message: gaps.join(' | '),
      type: 'warning',
      source_module: 'compliance',
      action_url: '/compliance/frameworks',
    });
    console.log(`[ComplianceAgent] ${gaps.length} gaps for ${modelName}`);
  }
}
