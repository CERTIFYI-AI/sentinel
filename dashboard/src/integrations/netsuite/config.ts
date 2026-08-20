// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the NetsuiteCredentials dataclass in
// sentinel/integrations/netsuite/adapter.py

import type { IntegrationConfig } from '../types'

export const NetsuiteConfig: IntegrationConfig = {
  id: 'netsuite',
  category: 'hr',
  name: 'NetSuite',
  description:
    'Joiner-mover-leaver evidence from NetSuite SuiteTalk employee records: '
    + 'terminated-employee status hygiene, manager-assignment coverage, and '
    + 'employment record change history.',
  logoUrl: '/integrations/netsuite.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/netsuite',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'account_id',
      label: 'Account ID',
      type: 'text',
      required: true,
      placeholder: '1234567_SB1',
      helpText: 'Your NetSuite account id, as shown in Setup > Company > Company Information.',
    },
    {
      id: 'consumer_key',
      label: 'Consumer key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The consumer key from the NetSuite integration record used for Token-Based Authentication.',
    },
    {
      id: 'consumer_credential',
      label: 'Consumer credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The consumer credential paired with the consumer key above.',
    },
    {
      id: 'token_id',
      label: 'Token ID',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The access token id issued to the integration user for TBA.',
    },
    {
      id: 'token_credential',
      label: 'Token credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The token credential paired with the token id above.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
