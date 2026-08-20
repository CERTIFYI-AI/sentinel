// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the MongoDbAtlasForGovernmentCredentials dataclass in
// sentinel/integrations/mongodb_atlas_for_government/adapter.py

import type { IntegrationConfig } from '../types'

export const MongoDbAtlasForGovernmentConfig: IntegrationConfig = {
  id: 'mongodb_atlas_for_government',
  category: 'cloud',
  name: 'MongoDB Atlas for Government',
  description:
    'Organization and project security posture in the FedRAMP-authorized '
    + 'Atlas for Government tenant: ORG_OWNER-scoped API keys, project IP '
    + 'access-list exposure, and encryption-at-rest key management.',
  logoUrl: '/integrations/mongodb_atlas_for_government.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/mongodb_atlas_for_government',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'public_key',
      label: 'Public key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••',
      helpText: 'The Atlas for Government Administration API public key, used as the HTTP Digest username. Grant it Organization Read Only or narrower.',
    },
    {
      id: 'private_credential',
      label: 'Private credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••••••',
      helpText: 'The private key paired with the public key above, used as the HTTP Digest password.',
    },
  ],
  checkCategories: [
    'access_control',
    'network_security',
    'encryption_at_rest',
  ],
}
