// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Shared shape for per-provider integration configs. The full 219-product
// catalog lives in the `integration_catalog` table (seeded from the
// Continuous GRC master sheet); this TS registry carries only providers with
// a shipped or in-progress adapter, because it defines the connect FORM —
// which credential fields to collect — not the browsable catalog.
//
// Security invariant: credential values collected through these fields are
// sent to the FastAPI backend, AES-256-GCM encrypted there
// (sentinel/integrations/crypto.py), and stored as ciphertext. The browser
// never persists or re-reads plaintext.

export type IntegrationCategory =
  | 'cloud' | 'identity' | 'code' | 'hr' | 'security' | 'saas'
  | 'device' | 'siem' | 'secrets' | 'cicd' | 'ticketing'
  | 'training' | 'collaboration' | 'hiring' | 'ai'

export type AuthMethod = 'api_key' | 'oauth2' | 'service_account'

export interface CredentialField {
  id: string
  label: string
  type: 'text' | 'password' | 'url'
  required: boolean
  placeholder?: string
  helpText?: string
}

export interface IntegrationConfig {
  /** Stable slug — matches integration_catalog.slug and the Python registry. */
  id: string
  category: IntegrationCategory
  name: string
  description: string
  logoUrl: string
  docsUrl: string
  authMethod: AuthMethod
  credentialFields: CredentialField[]
  /** check_category values this provider's adapter can evidence. */
  checkCategories: string[]
}
