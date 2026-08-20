// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the UkgCredentials dataclass in
// sentinel/integrations/ukg/adapter.py

import type { IntegrationConfig } from '../types'

export const UkgConfig: IntegrationConfig = {
  id: 'ukg',
  category: 'hr',
  name: 'UKG',
  description:
    'Joiner-mover-leaver evidence from UKG Pro / UKG Ready: employee roster '
    + 'and employment status, supervisor assignments, and personnel change '
    + 'history for access-review and offboarding compliance.',
  logoUrl: '/integrations/ukg.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/ukg',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'instance_url',
      label: 'Instance URL',
      type: 'url',
      required: true,
      placeholder: 'https://your-tenant.ukg.net',
      helpText: 'Your tenant-specific UKG Pro / UKG Ready API instance URL.',
    },
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from your UKG API client.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The OAuth2 client credential paired with the client ID above.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
