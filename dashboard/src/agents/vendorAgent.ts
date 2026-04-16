import { vendorsApi } from '@/api/vendors';
import { notificationsApi } from '@/api/notifications';

export async function vendorAgent(payload: any): Promise<void> {
  const { modelName, vendor } = payload;
  if (!vendor) return;

  const vendors = await vendorsApi.list();
  const match = vendors.find((v: any) =>
    v.name?.toLowerCase().includes(vendor.toLowerCase())
  );

  if (match && match.dpa_status !== 'signed') {
    await notificationsApi.create({
      title: `DPA gap: ${vendor} used by ${modelName}`,
      message: 'GDPR Art.28 — Data Processing Agreement not signed for this vendor',
      type: 'error',
      source_module: 'vendors',
      action_url: '/vendors',
    });
    console.log(`[VendorAgent] DPA gap for ${vendor}`);
  }
}
