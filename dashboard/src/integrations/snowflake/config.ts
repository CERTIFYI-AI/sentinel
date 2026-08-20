// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SnowflakeCredentials dataclass in
// sentinel/integrations/snowflake/adapter.py

import type { IntegrationConfig } from '../types'

export const SnowflakeConfig: IntegrationConfig = {
  id: 'snowflake',
  category: 'cloud',
  name: 'Snowflake',
  description:
    'Account security posture: stale ACCOUNTADMIN grants, account-level '
    + 'network policy enforcement, and Time Travel retention as a backup signal.',
  logoUrl: '/integrations/snowflake.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/snowflake',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'account_identifier',
      label: 'Account identifier',
      type: 'text',
      required: true,
      placeholder: 'xy12345.us-east-1',
      helpText: 'The Snowflake account identifier (organization-account or account locator + region).',
    },
    {
      id: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      placeholder: 'SENTINEL_READONLY',
      helpText: 'A service user with a role able to read ACCOUNT_USAGE and account parameters.',
    },
    {
      id: 'credential',
      label: 'Credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The password for the service user above.',
    },
  ],
  checkCategories: [
    'access_control',
    'network_security',
    'backup_recovery',
  ],
}
