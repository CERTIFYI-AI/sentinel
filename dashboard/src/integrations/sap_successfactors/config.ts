// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SapSuccessfactorsCredentials dataclass in
// sentinel/integrations/sap_successfactors/adapter.py

import type { IntegrationConfig } from '../types'

export const SapSuccessfactorsConfig: IntegrationConfig = {
  id: 'sap_successfactors',
  category: 'hr',
  name: 'SAP SuccessFactors',
  description:
    'Joiner-mover-leaver evidence from SAP SuccessFactors Employee Central: '
    + 'employment status, manager assignments, and audit trail history for '
    + 'access-review and offboarding compliance.',
  logoUrl: '/integrations/sap_successfactors.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/sap_successfactors',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'instance_url',
      label: 'Instance URL',
      type: 'url',
      required: true,
      placeholder: 'https://api4.successfactors.eu',
      helpText: 'Your tenant-specific SAP SuccessFactors API instance URL.',
    },
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from your SuccessFactors API OAuth client.',
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
