// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const HiddenLayerConfig: IntegrationConfig = {
  id: 'hiddenlayer',
  category: 'ai',
  name: 'HiddenLayer',
  description:
    'ML model security: vulnerability scans, adversarial attack detection, '
    + 'weight tampering alerts, and inference anomalies.',
  logoUrl: '/integrations/hiddenlayer.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/hiddenlayer',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'client_id',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'my-client-id',
      helpText: 'HiddenLayer API client ID.',
    },
    {
      id: 'client_credential',
      label: 'Client credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'Read-only client credential.',
    },
    {
      id: 'tenant',
      label: 'Tenant',
      type: 'text',
      required: false,
      placeholder: 'my-org',
    },
  ],
  checkCategories: [
    'vulnerability_management',
    'audit_logging',
  ],
}
