// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the HashicorpVaultCredentials dataclass in
// sentinel/integrations/hashicorp_vault/adapter.py

import type { IntegrationConfig } from '../types'

export const HashicorpVaultConfig: IntegrationConfig = {
  id: 'hashicorp_vault',
  category: 'secrets',
  name: 'HashiCorp Vault',
  description:
    'Vault’s own security posture: seal status and audit-device '
    + 'coverage, token TTL hygiene, and policy over-permissioning.',
  logoUrl: '/integrations/hashicorp_vault.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/hashicorp_vault',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'vault_addr',
      label: 'Vault address',
      type: 'url',
      required: true,
      placeholder: 'https://vault.example.com:8200',
      helpText: 'The base URL of the Vault cluster to monitor.',
    },
    {
      id: 'credential',
      label: 'Vault token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Vault token with read access to sys/seal-status, sys/audit, '
        + 'auth/token, and sys/policies/acl.',
    },
  ],
  checkCategories: [
    'secret_management',
    'access_control',
    'least_privilege',
  ],
}
