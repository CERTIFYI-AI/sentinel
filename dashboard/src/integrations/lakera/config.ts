// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const LakeraConfig: IntegrationConfig = {
  id: 'lakera_protect_ai',
  category: 'ai',
  name: 'Lakera / Protect AI',
  description:
    'AI guardrail posture: prompt injection detection, firewall policies, '
    + 'and block-log statistics.',
  logoUrl: '/integrations/lakera.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/lakera',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A read-only API key for the Lakera Guard account.',
    },
    {
      id: 'project',
      label: 'Project',
      type: 'text',
      required: false,
      placeholder: 'my-project',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'audit_logging',
  ],
}
