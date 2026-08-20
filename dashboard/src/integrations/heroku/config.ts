// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the HerokuCredentials dataclass in
// sentinel/integrations/heroku/adapter.py

import type { IntegrationConfig } from '../types'

export const HerokuConfig: IntegrationConfig = {
  id: 'heroku',
  category: 'cloud',
  name: 'Heroku',
  description:
    'Platform posture: OAuth authorizations that never expire, apps '
    + 'running a database add-on outside a Private Space, and Postgres '
    + 'add-ons with no recorded backup.',
  logoUrl: '/integrations/heroku.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/heroku',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Heroku API key from Account settings > API Key, or an OAuth token, with read access to apps, add-ons, and OAuth authorizations.',
    },
  ],
  checkCategories: [
    'access_control',
    'network_security',
    'backup_recovery',
  ],
}
