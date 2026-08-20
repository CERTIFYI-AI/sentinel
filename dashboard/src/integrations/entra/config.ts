// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the EntraCredentials / GraphCredentials dataclass in
// sentinel/integrations/msgraph/client.py — the backend validates the submitted
// shape against it, so a mismatch here is a 400, not a silent misconfiguration.
//
// Two catalogue slugs share one adapter. `cloud` is what separates them, and it
// is defaulted server-side for the GCC High credentials class so a sovereign
// tenant cannot end up querying commercial Graph and reporting an empty tenant
// as a clean one.

import type { IntegrationConfig } from '../types'

const sharedFields: IntegrationConfig['credentialFields'] = [
  {
    id: 'tenant_id',
    label: 'Directory (tenant) ID',
    type: 'text',
    required: true,
    placeholder: '00000000-0000-0000-0000-000000000000',
    helpText: 'Entra admin centre → Overview. The directory this connection governs.',
  },
  {
    id: 'client_id',
    label: 'Application (client) ID',
    type: 'text',
    required: true,
    placeholder: '00000000-0000-0000-0000-000000000000',
    helpText:
      'The app registration Sentinel authenticates as. It needs read-only '
      + 'application permissions — Policy.Read.All, RoleManagement.Read.Directory, '
      + 'User.Read.All, AuditLog.Read.All, Application.Read.All — with admin consent.',
  },
  {
    id: 'client_secret',
    label: 'Client secret',
    type: 'password',
    required: true,
    placeholder: '••••••••••••••••••••••••••••••••',
    helpText:
      'A certificate is preferable where your tenant policy allows it. Sent once '
      + 'over TLS and stored AES-256-GCM encrypted on the server.',
  },
]

const sharedCheckCategories = [
  'mfa_enforcement',
  'least_privilege',
  'access_control',
  'hr_controls',
  'secret_management',
  'audit_logging',
]

export const EntraConfig: IntegrationConfig = {
  id: 'microsoft_entra_id',
  category: 'identity',
  name: 'Microsoft Entra ID',
  description:
    'Identity posture: tenant-wide MFA (security defaults or Conditional Access), '
    + 'Global Administrator count, dormant enabled accounts, guest inventory, app '
    + 'registration credential expiry and sign-in log availability.',
  logoUrl: '/integrations/entra.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/entra',
  authMethod: 'oauth2',
  credentialFields: sharedFields,
  checkCategories: sharedCheckCategories,
}

export const EntraGccHighConfig: IntegrationConfig = {
  id: 'microsoft_entra_id_gcc_high',
  category: 'identity',
  name: 'Microsoft Entra ID (GCC High)',
  description:
    'The same identity checks as the commercial connector, against the US '
    + 'Government cloud endpoints (login.microsoftonline.us / graph.microsoft.us).',
  logoUrl: '/integrations/entra.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/entra',
  authMethod: 'oauth2',
  credentialFields: sharedFields,
  checkCategories: sharedCheckCategories,
}
