// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the QuickbooksCredentials dataclass in
// sentinel/integrations/quickbooks/adapter.py

import type { IntegrationConfig } from '../types'

export const QuickbooksConfig: IntegrationConfig = {
  id: 'quickbooks',
  category: 'saas',
  name: 'QuickBooks Online',
  description:
    'Company user roles, change audit log, and unreviewed high-value '
    + 'bills from QuickBooks Online for financial-controls-access evidence.',
  logoUrl: '/integrations/quickbooks.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/quickbooks',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'ABCDEFghijklmnopqrstuvwxyz0123456789',
      helpText: 'The OAuth2 client ID from your Intuit Developer app.',
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
      id: 'realm_id',
      label: 'Realm ID',
      type: 'text',
      required: true,
      placeholder: '123145678901234',
      helpText: 'The QuickBooks company (realm) ID this connection is scoped to.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'access_control',
  ],
}
