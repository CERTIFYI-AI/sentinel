// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the RenderCredentials dataclass in
// sentinel/integrations/render/adapter.py

import type { IntegrationConfig } from '../types'

export const RenderConfig: IntegrationConfig = {
  id: 'render',
  category: 'cloud',
  name: 'Render',
  description:
    'Platform security posture: workspace admin role concentration, Postgres '
    + 'IP allow-listing, and Postgres high-availability as a backup signal.',
  logoUrl: '/integrations/render.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/render',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: 'rnd_••••••••••••••••••••••••••••',
      helpText: 'A Bearer API key from Render Account Settings > API Keys, scoped to the workspace to monitor.',
    },
  ],
  checkCategories: [
    'access_control',
    'network_security',
    'backup_recovery',
  ],
}
