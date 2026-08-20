// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the CalendlyCredentials dataclass in
// sentinel/integrations/calendly/adapter.py

import type { IntegrationConfig } from '../types'

export const CalendlyConfig: IntegrationConfig = {
  id: 'calendly',
  category: 'collaboration',
  name: 'Calendly',
  description:
    'Access-review and data-location evidence: organization owner/admin '
    + 'concentration, webhook subscription transport security, and '
    + 'publicly-listed event types.',
  logoUrl: '/integrations/calendly.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/calendly',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Personal Access Token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Calendly Personal Access Token from an organization owner/admin '
        + 'account, used to read organization membership, webhooks, and event types.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'encryption_in_transit',
    'access_control',
  ],
}
