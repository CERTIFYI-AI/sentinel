// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// connectionProfiles — what to ask an operator when they connect a catalogue
// product, for ALL 219 of them rather than the three with a shipped adapter.
//
// The problem this solves: opening a catalogue entry used to give operator
// prose and, for 216 of 219 products, no way to record anything. The product
// was browsable and unusable.
//
// The problem it must NOT solve by lying: only `github`, `aws` and
// `microsoft_azure` can actually collect evidence today. Rendering a credential
// form for the other 216 would take a secret the platform has no adapter to
// use — worse than no form, because the operator would reasonably expect
// collection to follow.
//
// So a profile has two modes, and every catalogue entry has exactly one:
//
//   automated  an adapter ships (`adapter_status` available|beta). Fields are
//              the adapter's OWN credential contract, hand-written and pinned
//              to the Python dataclass. Submitting encrypts and queues a sync.
//
//   monitored  no adapter. Fields describe the SOURCE, not a secret: which
//              tenant, who owns it, where its evidence lives, how often it is
//              reviewed. Submitting registers a governed source with a named
//              owner and a review cadence. It collects nothing automatically
//              and says so.
//
// Where the monitored fields come from matters for "no invented data": the
// shape is derived from the catalogue row's OWN `category` column, and the
// auth methods offered are parsed out of the row's OWN `evidence_pull` prose.
// Nothing here asserts a product-specific API fact that the catalogue does not
// already state.

import type { CatalogEntry } from '@/services/integrationCatalogService'
import { getIntegrationConfig } from './index'
import { getProductProfile } from './productProfiles'
import type { CredentialField } from './types'

export type ConnectionMode = 'automated' | 'monitored'

export interface ProfileField extends CredentialField {
  /** Fixed choices; renders a select instead of a free-text input. */
  options?: readonly string[]
}

export interface ConnectionProfile {
  slug: string
  name: string
  mode: ConnectionMode
  /** 'connect' encrypts credentials and syncs; 'register' stores no secret. */
  action: 'connect' | 'register'
  /**
   * Auth methods this product's catalogue row names, in the row's own words.
   * Empty when the row says nothing — never guessed.
   */
  authMethods: string[]
  fields: ProfileField[]
  /**
   * Set only when the product ships an adapter but no credential form is
   * registered for it. That is a packaging mistake, not an operator problem.
   */
  packagingGap: boolean
  /**
   * True when the monitored fields came from this product's own verified
   * profile rather than from its category. Drives the UI's "these are the
   * fields <product> actually uses" line — worth stating, because the generic
   * fallback deliberately does not claim it.
   */
  productSpecific: boolean
  /** One actionable sentence about how this product is connected, when known. */
  setupHint?: string
}

/**
 * Auth methods we recognise in `evidence_pull`. Matching is on the catalogue's
 * own wording, so a row that says nothing about OAuth never offers OAuth.
 */
const AUTH_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\boauth\b/i, 'OAuth'],
  [/\bapi key\b/i, 'API key'],
  [/\bscim\b/i, 'SCIM'],
  [/\bservice account\b/i, 'Service account'],
  [/\bwebhook/i, 'Webhook'],
  [/\bsaml\b/i, 'SAML'],
  [/\bcsv\b|\bexport\b/i, 'File export'],
  [/\brest api\b/i, 'REST API'],
]

/** The auth methods the catalogue row itself names, de-duplicated, in order. */
export function authMethodsFromEvidencePull(text: string | null | undefined): string[] {
  const value = (text ?? '').trim()
  if (!value) return []
  const found: string[] = []
  for (const [re, label] of AUTH_PATTERNS) {
    if (re.test(value) && !found.includes(label)) found.push(label)
  }
  return found
}

/**
 * How a source of this category is identified. Keyed on `integration_catalog.
 * category`, which is real catalogue data — not on a per-product guess.
 */
const SCOPE_FIELD: Record<string, ProfileField> = {
  cloud: {
    id: 'account_ref',
    label: 'Account, subscription or project',
    type: 'text',
    required: true,
    placeholder: '123456789012 · sub-guid · my-gcp-project',
    helpText: 'The specific account this registration governs. One row per account keeps ownership unambiguous.',
  },
  identity: {
    id: 'tenant_url',
    label: 'Tenant or directory URL',
    type: 'url',
    required: true,
    placeholder: 'https://example.provider.com',
    helpText: 'The tenant an auditor would be pointed at.',
  },
  code: {
    id: 'organization',
    label: 'Organisation or workspace',
    type: 'text',
    required: true,
    placeholder: 'certifyi-ai',
    helpText: 'The organisation whose repositories this registration covers.',
  },
  siem: {
    id: 'instance_url',
    label: 'Instance URL',
    type: 'url',
    required: true,
    placeholder: 'https://siem.example.com',
  },
  security: {
    id: 'instance_url',
    label: 'Instance or console URL',
    type: 'url',
    required: true,
    placeholder: 'https://console.example.com',
  },
  secrets: {
    id: 'instance_url',
    label: 'Vault or store URL',
    type: 'url',
    required: true,
    placeholder: 'https://vault.example.com',
  },
}

const DEFAULT_SCOPE_FIELD: ProfileField = {
  id: 'tenant_ref',
  label: 'Tenant, workspace or account',
  type: 'text',
  required: true,
  placeholder: 'acme-production',
  helpText: 'Which instance of this product the registration covers.',
}

export const REVIEW_CADENCES = [
  'Monthly', 'Quarterly', 'Semi-annually', 'Annually', 'On change',
] as const

/**
 * Fields every monitored source carries, whatever the product.
 *
 * `owner_name` and `review_cadence` are required for a reason: a registered
 * source with no named owner and no cadence is an entry in a list, not a
 * control. EU AI Act Art. 12 and ISO/IEC 42001 §9.1 both turn on somebody
 * being accountable for looking.
 */
function monitoredCommonFields(authMethods: string[]): ProfileField[] {
  const fields: ProfileField[] = [
    {
      id: 'owner_name',
      label: 'Accountable owner',
      type: 'text',
      required: true,
      placeholder: 'Name or team',
      helpText: 'Who answers for this source when an auditor asks. Recorded on the integration record.',
    },
    {
      id: 'review_cadence',
      label: 'Review cadence',
      type: 'text',
      required: true,
      options: REVIEW_CADENCES,
      helpText: 'How often the evidence from this source is refreshed by hand.',
    },
    {
      id: 'evidence_url',
      label: 'Where its evidence lives',
      type: 'url',
      required: false,
      placeholder: 'https://drive.example.com/audit/2026',
      helpText: 'A link an auditor can follow — the export, the report, the ticket queue.',
    },
    {
      id: 'scope_notes',
      label: 'Scope notes',
      type: 'text',
      required: false,
      placeholder: 'Which resources, which environments, what is out of scope',
    },
  ]
  // Only offered when the catalogue row names more than one way in; with one
  // (or none) there is nothing to choose and the select would be noise.
  if (authMethods.length > 1) {
    fields.splice(1, 0, {
      id: 'auth_method',
      label: 'Intended access method',
      type: 'text',
      required: false,
      options: authMethods,
      helpText: 'From this product’s catalogue entry. Recorded so the eventual adapter starts from the right contract.',
    })
  }
  return fields
}

/**
 * The connection profile for one catalogue entry.
 *
 * Pure — no network, no clock — so the whole 219-row matrix can be asserted in
 * tests, which is the only way to be sure no product falls through to an empty
 * form.
 */
export function buildConnectionProfile(entry: CatalogEntry): ConnectionProfile {
  const authMethods = authMethodsFromEvidencePull(entry.evidencePull)
  const shipsAdapter = entry.adapterStatus === 'available' || entry.adapterStatus === 'beta'

  if (shipsAdapter) {
    const config = getIntegrationConfig(entry.slug)
    const product = getProductProfile(entry.slug)
    return {
      slug: entry.slug,
      name: entry.name,
      mode: 'automated',
      action: 'connect',
      // The adapter's own contract is authoritative here; the product profile
      // only contributes the human-readable method and hint.
      authMethods: product ? [product.authMethod] : authMethods,
      fields: config?.credentialFields ?? [],
      packagingGap: !config,
      productSpecific: Boolean(config),
      setupHint: product?.setupHint,
    }
  }

  // A product's own verified profile wins over the category shape. AWS is
  // identified by a 12-digit account number, Zoom by an Account ID from a
  // Server-to-Server OAuth app, Okta by an org URL — asking all three for
  // "tenant, workspace or account" records something nobody can act on.
  const product = getProductProfile(entry.slug)
  const scopeFields = product?.fields ?? [SCOPE_FIELD[entry.category] ?? DEFAULT_SCOPE_FIELD]

  // When we know how this product authenticates, that fact replaces the
  // catalogue's generic "REST API / OAuth / API key / SCIM depending on
  // vendor" — which is the same sentence on most rows and so tells an operator
  // nothing about THIS product.
  const methods = product ? [product.authMethod] : authMethods

  return {
    slug: entry.slug,
    name: entry.name,
    mode: 'monitored',
    action: 'register',
    authMethods: methods,
    fields: [...scopeFields, ...monitoredCommonFields(methods)],
    packagingGap: false,
    productSpecific: Boolean(product),
    setupHint: product?.setupHint,
  }
}

/** Fields the operator has left blank that the profile requires. */
export function missingRequired(
  profile: ConnectionProfile,
  values: Record<string, string>,
): ProfileField[] {
  return profile.fields.filter(f => f.required && !(values[f.id] ?? '').trim())
}
