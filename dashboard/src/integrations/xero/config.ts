// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the XeroCredentials dataclass in
// sentinel/integrations/xero/adapter.py

import type { IntegrationConfig } from '../types'

export const XeroConfig: IntegrationConfig = {
  id: 'xero',
  category: 'saas',
  name: 'Xero',
  description:
    'Organisation user roles, SSO/MFA enforcement, and unreviewed '
    + 'high-value invoices from Xero for financial-controls-access evidence.',
  logoUrl: '/integrations/xero.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/xero',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The OAuth2 client ID from your Xero Custom Connection app.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The OAuth2 client credential paired with the client ID above.',
    },
    {
      id: 'tenant_id',
      label: 'Tenant ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The Xero organisation (tenant) ID this Custom Connection is scoped to.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'mfa_enforcement',
    'access_control',
  ],
}
