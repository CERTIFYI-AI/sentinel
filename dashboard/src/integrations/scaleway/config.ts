// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the ScalewayCredentials dataclass in
// sentinel/integrations/scaleway/adapter.py

import type { IntegrationConfig } from '../types'

export const ScalewayConfig: IntegrationConfig = {
  id: 'scaleway',
  category: 'cloud',
  name: 'Scaleway',
  description:
    'Cloud infrastructure posture: non-expiring API keys, security groups '
    + 'that expose administrative ports to the internet, and Block Storage '
    + 'volumes with no snapshot.',
  logoUrl: '/integrations/scaleway.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/scaleway',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Secret key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Scaleway secret key from Identity and Access Management > API keys, sent as X-Auth-Token.',
    },
    {
      id: 'project_id',
      label: 'Project ID',
      type: 'text',
      required: false,
      placeholder: '11111111-1111-1111-1111-111111111111',
      helpText: 'Default Project to scope API key, security group, and volume listings. Leave blank to use the key\'s default project.',
    },
    {
      id: 'zone',
      label: 'Availability zone',
      type: 'text',
      required: false,
      placeholder: 'fr-par-1',
      helpText: 'Zone to check for security groups and Block Storage volumes. Defaults to fr-par-1.',
    },
  ],
  checkCategories: [
    'access_control',
    'network_security',
    'backup_recovery',
  ],
}
