// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Registry of providers with a connect form (shipped or in-progress
// adapters). The browsable catalog of all 219 products comes from the
// integration_catalog table — do not mirror it here.

import type { IntegrationConfig } from './types'
import { GithubConfig } from './github/config'

export type { IntegrationConfig, CredentialField, IntegrationCategory, AuthMethod } from './types'

export const INTEGRATIONS: IntegrationConfig[] = [
  GithubConfig,
]

export function getIntegrationConfig(id: string): IntegrationConfig | undefined {
  return INTEGRATIONS.find((i) => i.id === id)
}
