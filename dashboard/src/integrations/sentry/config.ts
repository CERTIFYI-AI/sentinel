// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SentryCredentials dataclass in
// sentinel/integrations/sentry/adapter.py

import type { IntegrationConfig } from '../types'

export const SentryConfig: IntegrationConfig = {
  id: 'sentry',
  category: 'security',
  name: 'Sentry',
  description:
    'Error monitoring posture: unresolved issues by severity, project DSN '
    + 'configuration, and release health for incident response and '
    + 'vulnerability management evidence.',
  logoUrl: '/integrations/sentry.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/sentry',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_token',
      label: 'Auth token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Sentry auth token with org:read and project:read scopes. '
        + 'Release health may require project:releases scope.',
    },
    {
      id: 'organization_slug',
      label: 'Organization slug',
      type: 'text',
      required: true,
      placeholder: 'my-org',
      helpText:
        'The slug identifying your Sentry organization (visible in the '
        + 'URL at sentry.io/organizations/<slug>/).',
    },
  ],
  checkCategories: [
    'incident_response',
    'vulnerability_management',
  ],
}
