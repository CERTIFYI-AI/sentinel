// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the MongoDbAtlasCredentials dataclass in
// sentinel/integrations/mongodb_atlas/adapter.py

import type { IntegrationConfig } from '../types'

export const MongoDbAtlasConfig: IntegrationConfig = {
  id: 'mongodb_atlas',
  category: 'cloud',
  name: 'MongoDB Atlas',
  description:
    'Organization and project security posture: ORG_OWNER-scoped API keys, '
    + 'project IP access-list exposure, and encryption-at-rest key management.',
  logoUrl: '/integrations/mongodb_atlas.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/mongodb_atlas',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'public_key',
      label: 'Public key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••',
      helpText: 'The Atlas Administration API public key, used as the HTTP Digest username. Grant it Organization Read Only or narrower.',
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
