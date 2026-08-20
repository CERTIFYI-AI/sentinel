// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const KeyVaultConfig: IntegrationConfig = {
  id: 'azure_key_vault',
  category: 'secrets',
  name: 'Azure Key Vault',
  description:
    'Secrets management posture: vault inventory, soft delete, and '
    + 'purge protection across the subscription.',
  logoUrl: '/integrations/keyvault.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/keyvault',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'tenant_id',
      label: 'Directory (tenant) ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'Entra admin centre → Overview.',
    },
    {
      id: 'client_id',
      label: 'Application (client) ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText:
        'The app registration needs Reader RBAC on the subscription '
        + 'and Key Vault Reader on the vaults.',
    },
    {
      id: 'client_secret',
      label: 'Client secret',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'Sent once over TLS and stored AES-256-GCM encrypted on the server.',
    },
    {
      id: 'subscription_id',
      label: 'Azure Subscription ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The subscription containing the Key Vaults to scan.',
    },
  ],
  checkCategories: ['secret_management', 'backup_recovery'],
}
