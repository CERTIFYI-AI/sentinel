// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the DropboxCredentials dataclass in
// sentinel/integrations/dropbox/adapter.py

import type { IntegrationConfig } from '../types'

export const DropboxConfig: IntegrationConfig = {
  id: 'dropbox',
  category: 'collaboration',
  name: 'Dropbox',
  description:
    'Access-review and data-location evidence: team admin-role '
    + 'concentration, team activity log retrievability, and '
    + 'publicly-visible shared links.',
  logoUrl: '/integrations/dropbox.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/dropbox',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'access_credential',
      label: 'Team access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Dropbox Business team-scoped access token with members.read, '
        + 'events.read, and sharing.read scopes.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'audit_logging',
    'data_classification',
  ],
}
