// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the FieldguideCredentials dataclass in
// sentinel/integrations/fieldguide/adapter.py

import type { IntegrationConfig } from '../types'

export const FieldguideConfig: IntegrationConfig = {
  id: 'fieldguide',
  category: 'security',
  name: 'Fieldguide',
  description:
    'Audit-engagement evidence-collection status: overdue request-list '
    + 'items, client-side portal access, and evidence upload audit-trail '
    + 'retrievability from Fieldguide.',
  logoUrl: '/integrations/fieldguide.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/fieldguide',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API token from Fieldguide firm-admin settings with read access to engagements, request-list items, and access records.',
    },
  ],
  checkCategories: [
    'vendor_management',
    'access_control',
    'audit_logging',
  ],
}
