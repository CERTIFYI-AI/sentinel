// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the AwsCredentials dataclass in
// sentinel/integrations/aws/adapter.py — the backend validates the submitted
// shape against it, so a mismatch here is a 400, not a silent misconfiguration.

import type { IntegrationConfig } from '../types'

export const AwsConfig: IntegrationConfig = {
  id: 'aws',
  category: 'cloud',
  name: 'AWS',
  description:
    'Account security posture: root and user MFA, password policy, access-key '
    + 'age, direct AdministratorAccess, CloudTrail coverage, S3 public access '
    + 'and encryption, EBS and RDS encryption, security-group exposure, KMS key '
    + 'rotation, GuardDuty and AWS Backup.',
  logoUrl: '/integrations/aws.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/aws',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'access_key_id',
      label: 'Access key ID',
      type: 'text',
      required: true,
      placeholder: 'AKIA…',
      helpText:
        'An IAM user with the AWS-managed SecurityAudit policy. Every call '
        + 'Sentinel makes is read-only (Describe/Get/List) — no write '
        + 'permission is needed or used.',
    },
    {
      id: 'secret_access_key',
      label: 'Secret access key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'Sent once over TLS and stored AES-256-GCM encrypted on the server.',
    },
    {
      id: 'region',
      label: 'Region',
      type: 'text',
      required: true,
      placeholder: 'us-east-1',
      helpText:
        'Account-wide checks (IAM, S3, CloudTrail) cover the whole account. '
        + 'Resource checks (EBS default encryption, RDS, security groups, KMS, '
        + 'GuardDuty, Backup) cover this region only — connect each region you '
        + 'run workloads in.',
    },
    {
      id: 'role_arn',
      label: 'Role to assume',
      type: 'text',
      required: false,
      placeholder: 'arn:aws:iam::123456789012:role/SentinelAudit',
      helpText:
        'Preferred for production: the keys above only need sts:AssumeRole, and '
        + 'you can revoke Sentinel by deleting the role rather than rotating a secret.',
    },
    {
      id: 'external_id',
      label: 'External ID',
      type: 'text',
      required: false,
      placeholder: 'Required by the role trust policy',
      helpText:
        'Set this when the role is used, and require it in the role trust '
        + 'policy — it is what stops a third party being used as a confused deputy.',
    },
    {
      id: 'session_token',
      label: 'Session token',
      type: 'password',
      required: false,
      helpText: 'Only for temporary STS credentials. Leave blank for a long-lived IAM user key.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py —
  // these drive the control mapping shown on the connect screen.
  checkCategories: [
    'mfa_enforcement',
    'access_control',
    'least_privilege',
    'audit_logging',
    'encryption_at_rest',
    'network_security',
    'secret_management',
    'incident_response',
    'backup_recovery',
  ],
}
