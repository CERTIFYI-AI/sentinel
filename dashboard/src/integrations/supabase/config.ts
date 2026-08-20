// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SupabaseCredentials dataclass in
// sentinel/integrations/supabase/adapter.py

import type { IntegrationConfig } from '../types'

export const SupabaseConfig: IntegrationConfig = {
  id: 'supabase',
  category: 'cloud',
  name: 'Supabase',
  description:
    'Managed Postgres platform posture: Owner-role concentration, projects '
    + 'with unrestricted direct database access, and projects with no '
    + 'backup or point-in-time recovery configured.',
  logoUrl: '/integrations/supabase.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/supabase',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'Management API access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Supabase Management API Personal Access Token from Account > Access Tokens with read access to organizations and projects.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'network_security',
    'backup_recovery',
  ],
}
