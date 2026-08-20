// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the BamboohrCredentials dataclass in
// sentinel/integrations/bamboohr/adapter.py

import type { IntegrationConfig } from '../types'

export const BamboohrConfig: IntegrationConfig = {
  id: 'bamboohr',
  category: 'hr',
  name: 'BambooHR',
  description:
    'Joiner-mover-leaver evidence from BambooHR: employee roster and '
    + 'employment status, reporting manager assignments, and recent-changes '
    + 'history for access-review and offboarding compliance.',
  logoUrl: '/integrations/bamboohr.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/bamboohr',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'subdomain',
      label: 'BambooHR subdomain',
      type: 'text',
      required: true,
      placeholder: 'yourco',
      helpText: 'The company subdomain in your BambooHR URL, e.g. "yourco" for yourco.bamboohr.com.',
    },
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A BambooHR API key, used as the HTTP Basic username with a fixed password of "x".',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
