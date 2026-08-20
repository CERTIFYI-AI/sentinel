// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the DigitaloceanCredentials dataclass in
// sentinel/integrations/digitalocean/adapter.py

import type { IntegrationConfig } from '../types'

export const DigitaloceanConfig: IntegrationConfig = {
  id: 'digitalocean',
  category: 'cloud',
  name: 'DigitalOcean',
  description:
    'Cloud infrastructure posture: API token hygiene, Droplets exposed '
    + 'without a firewall, and Droplet backup configuration.',
  logoUrl: '/integrations/digitalocean.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/digitalocean',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Personal Access Token from API > Tokens with read access to Droplets, firewalls, and account tokens.',
    },
  ],
  checkCategories: [
    'access_control',
    'network_security',
    'backup_recovery',
  ],
}
