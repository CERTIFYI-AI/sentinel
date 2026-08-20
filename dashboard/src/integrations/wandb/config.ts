// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const WandbConfig: IntegrationConfig = {
  id: 'weights_biases_w_b',
  category: 'ai',
  name: 'Weights & Biases (W&B)',
  description:
    'Experiment tracking posture: team membership, project visibility, '
    + 'artifact lineage, and dataset versioning.',
  logoUrl: '/integrations/wandb.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/wandb',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A W&B service account API key.',
    },
    {
      id: 'entity',
      label: 'Entity (team)',
      type: 'text',
      required: true,
      placeholder: 'my-team',
    },
    {
      id: 'host',
      label: 'Host',
      type: 'url',
      required: false,
      placeholder: 'https://api.wandb.ai',
      helpText: 'Self-hosted URL, or leave for SaaS.',
    },
  ],
  checkCategories: [
    'access_control',
    'data_classification',
    'audit_logging',
  ],
}
