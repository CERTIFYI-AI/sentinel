// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// legal — the one place the app names its legal documents and operating entity.
//
// The Login page, the Signup page and the Help panel all need these. Defining
// them once means a URL change is a one-line edit rather than a hunt through
// JSX, and it is why the Login/Signup links can no longer silently rot back to
// `href="#"` — which is what they were before: a signup flow that required
// agreeing to documents the user had no way to open.
//
// Canonical source text lives in `docs/legal/`; these URLs are where it is
// published. See docs/legal/README.md.

/** Published Terms of Service. */
export const TERMS_URL = 'https://certifyi.ai/terms-of-service/'

/** Published Privacy Policy. */
export const PRIVACY_URL = 'https://certifyi.ai/privacy-policy/'

/** Marketing site. */
export const WEBSITE_URL = 'https://certifyi.ai'

/** Support and privacy-request inbox. */
export const CONTACT_EMAIL = 'get@certifyi.ai'

/** Support phone number, in dialable form. */
export const CONTACT_PHONE = '+977-9851334787'

/**
 * The operating entity behind Certifyi AI. Named in both legal documents, so
 * the product and the paperwork agree on who the counterparty is.
 */
export const COMPANY = {
  name: 'Dignep Group Pvt. Ltd.',
  legalName: 'DIGNEP GROUP PRIVATE LIMITED',
  address: 'Pulchowk, Lalitpur, Nepal',
  registrationNo: '200505/2075/76',
} as const

/** Attributes for an external link that opens safely in a new tab. */
export const EXTERNAL_LINK_PROPS = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const
