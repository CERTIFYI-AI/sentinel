// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import type { IntegrationConfig } from '../types'

export const AwsSecretsManagerConfig: IntegrationConfig = {
  id: 'aws_secrets_manager',
  category: 'secrets',
  name: 'AWS Secrets Manager',
  description:
    'Secret hygiene: inventory, rotation coverage, '
    + 'and stale-secret detection.',
  logoUrl: '/integrations/aws.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/aws-secrets-manager',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'access_key_id',
      label: 'Access key ID',
      type: 'text',
      required: true,
      placeholder: 'AKIA…',
      helpText:
        'IAM user with SecretsManagerReadOnly policy. Read-only — '
        + 'no write permission is needed.',
    },
    {
      id: 'secret_access_key',
      label: 'Secret access key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'Sent once over TLS and stored AES-256-GCM encrypted.',
    },
    {
      id: 'region',
      label: 'Region',
      type: 'text',
      required: true,
      placeholder: 'us-east-1',
      helpText: 'Secrets Manager region to audit.',
    },
    {
      id: 'role_arn',
      label: 'Role to assume',
      type: 'text',
      required: false,
      placeholder: 'arn:aws:iam::123456789012:role/SentinelAudit',
      helpText: 'Preferred for production — revoke by deleting the role.',
    },
    {
      id: 'external_id',
      label: 'External ID',
      type: 'text',
      required: false,
      helpText: 'Required by the role trust policy to prevent confused-deputy.',
    },
    {
      id: 'session_token',
      label: 'Session token',
      type: 'password',
      required: false,
      helpText: 'Only for temporary STS credentials.',
    },
  ],
  checkCategories: ['secret_management'],
}
