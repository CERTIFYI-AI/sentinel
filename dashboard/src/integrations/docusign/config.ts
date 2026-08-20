// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the DocusignCredentials dataclass in
// sentinel/integrations/docusign/adapter.py

import type { IntegrationConfig } from '../types'

export const DocusignConfig: IntegrationConfig = {
  id: 'docusign',
  category: 'collaboration',
  name: 'DocuSign',
  description:
    'Access-review and data-location evidence: account administrator '
    + 'concentration, envelope audit trail retrievability, and '
    + 'publicly-accessible PowerForms.',
  logoUrl: '/integrations/docusign.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/docusign',
  authMethod: 'oauth2',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Integration key (Client ID)',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The Integration Key from your DocuSign app.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The client secret paired with the integration key above.',
    },
    {
      id: 'account_id',
      label: 'Account ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'The DocuSign account ID to evidence.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'data_classification',
  ],
}
