// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the IntuneCredentials / GraphCredentials dataclass in
// sentinel/integrations/msgraph/client.py — the backend validates the submitted
// shape against it, so a mismatch here is a 400, not a silent misconfiguration.
//
// Two catalogue slugs share one adapter. `cloud` is what separates them, and it
// is defaulted server-side for the GCC High credentials class so a sovereign
// tenant cannot end up querying commercial Graph.

import type { IntegrationConfig } from '../types'

const sharedFields: IntegrationConfig['credentialFields'] = [
  {
    id: 'tenant_id',
    label: 'Directory (tenant) ID',
    type: 'text',
    required: true,
    placeholder: '00000000-0000-0000-0000-000000000000',
    helpText: 'Entra admin centre → Overview. The directory this connection governs.',
  },
  {
    id: 'client_id',
    label: 'Application (client) ID',
    type: 'text',
    required: true,
    placeholder: '00000000-0000-0000-0000-000000000000',
    helpText:
      'The app registration Sentinel authenticates as. It needs read-only '
      + 'application permissions — DeviceManagementManagedDevices.Read.All, '
      + 'DeviceManagementConfiguration.Read.All, DeviceManagementApps.Read.All — '
      + 'with admin consent.',
  },
  {
    id: 'client_secret',
    label: 'Client secret',
    type: 'password',
    required: true,
    placeholder: '••••••••••••••••••••••••••••••••',
    helpText:
      'A certificate is preferable where your tenant policy allows it. Sent once '
      + 'over TLS and stored AES-256-GCM encrypted on the server.',
  },
]

const sharedCheckCategories = [
  'endpoint_protection',
  'encryption_at_rest',
  'vulnerability_management',
  'hr_controls',
]

export const IntuneConfig: IntegrationConfig = {
  id: 'microsoft_intune',
  category: 'device',
  name: 'Microsoft Intune',
  description:
    'Device compliance posture: overall compliance rate, disk encryption, OS '
    + 'currency, inactive devices, compliance policy existence and app '
    + 'protection policies.',
  logoUrl: '/integrations/intune.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/intune',
  authMethod: 'oauth2',
  credentialFields: sharedFields,
  checkCategories: sharedCheckCategories,
}

export const IntuneGccHighConfig: IntegrationConfig = {
  id: 'microsoft_intune_gcc_high',
  category: 'device',
  name: 'Microsoft Intune (GCC High)',
  description:
    'The same device compliance checks as the commercial connector, against the '
    + 'US Government cloud endpoints (login.microsoftonline.us / graph.microsoft.us).',
  logoUrl: '/integrations/intune.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/intune',
  authMethod: 'oauth2',
  credentialFields: sharedFields,
  checkCategories: sharedCheckCategories,
}
