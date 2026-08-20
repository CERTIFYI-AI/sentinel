// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the JamfProCredentials dataclass in
// sentinel/integrations/jamf_pro/adapter.py — the backend validates the submitted
// shape against it, so a mismatch here is a 400, not a silent misconfiguration.

import type { IntegrationConfig } from '../types'

export const JamfProConfig: IntegrationConfig = {
  id: 'jamf_pro',
  category: 'device',
  name: 'Jamf Pro',
  description:
    'Device posture: endpoint protection (managed status), OS patch level, '
    + 'FileVault/BitLocker disk encryption, and configuration profile compliance.',
  logoUrl: '/integrations/jamf_pro.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/jamf-pro',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'instance_url',
      label: 'Jamf Pro instance URL',
      type: 'url',
      required: true,
      placeholder: 'https://yourorg.jamfcloud.com',
      helpText:
        'The full URL of your Jamf Pro instance, including the protocol.',
    },
    {
      id: 'client_id',
      label: 'API client ID',
      type: 'text',
      required: true,
      placeholder: 'your-api-client-id',
      helpText:
        'Create an API client under Settings > API Roles and Clients with '
        + 'read-only access to computers and configuration profiles.',
    },
    {
      id: 'client_credential',
      label: 'API client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'The credential generated for the API client. Sent once over TLS and '
        + 'stored AES-256-GCM encrypted on the server.',
    },
  ],
  checkCategories: [
    'endpoint_protection',
    'vulnerability_management',
    'encryption_at_rest',
    'access_control',
  ],
}
