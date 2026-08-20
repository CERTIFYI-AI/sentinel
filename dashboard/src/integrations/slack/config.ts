// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SlackCredentials dataclass in
// sentinel/integrations/slack/adapter.py

import type { IntegrationConfig } from '../types'

export const SlackConfig: IntegrationConfig = {
  id: 'slack',
  category: 'collaboration',
  name: 'Slack',
  description:
    'Access-review and data-location evidence: workspace admin/owner '
    + 'concentration, Enterprise Grid audit log retrievability, and Slack '
    + 'Connect external-shared channel exposure.',
  logoUrl: '/integrations/slack.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/slack',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'bot_token',
      label: 'Bot User OAuth Token',
      type: 'password',
      required: true,
      placeholder: 'xoxb-••••••••••••••••••••••••',
      helpText:
        'A Bot User OAuth Token from your Slack app, with users:read, '
        + 'channels:read, groups:read, and auditlogs:read scopes.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'access_control',
  ],
}
