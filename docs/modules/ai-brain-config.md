# AI Brain Configuration

## Purpose
Provides a secure, org-scoped Settings UI for connecting an external AI
provider (OpenAI, Anthropic, Google AI, Azure OpenAI) to the platform's
AI Brain evaluation engine, and for choosing the judge and embedding models
that power compliance scoring, semantic search, and auto-triage.

## Why it exists
AI Brain is Sentinel's compliance evaluation and reasoning engine. Without a
configured provider key the engine operates in manual-only mode — no automated
compliance checks, no semantic search, no auto-triage. This module gives
administrators a single place to supply credentials, pick models, set the
auto-action confidence threshold, and enable/disable the engine, all backed
by AES-256-GCM encryption so plaintext keys never touch the database.

## How it works
1. The React form (Settings > AI Brain tab) collects provider, API key, model
   preferences, confidence threshold and enabled flag.
2. On save, the browser calls the `ai-brain-config` Supabase Edge Function via
   `supabase.functions.invoke()`. The JWT is attached automatically.
3. The Edge Function verifies the caller's JWT, resolves their org from
   `user_profiles`, encrypts the API key with AES-256-GCM (same blob format as
   integrations), and upserts the `ai_brain_config` row for that org.
4. Reads return the configuration without the encrypted blob — only the
   `key_prefix` (first 8 chars + "…") is sent to the browser for display.
5. At evaluation time, the Python backend reads `ai_brain_config` for the
   caller's org and decrypts the key with `decrypt_credentials()`.

## Features

| Feature | Description |
|---|---|
| Provider selection | OpenAI, Anthropic, Google AI, Azure OpenAI |
| Encrypted key storage | AES-256-GCM — plaintext never reaches the DB |
| Key prefix display | First 8 characters shown for verification |
| Judge model picker | Provider-specific LLM model list |
| Embedding model picker | Provider-specific embedding model list |
| Confidence threshold | 50%–100% slider controlling auto-action cutoff |
| Enable/disable toggle | Activates or suspends the AI Brain engine |
| Feature explanation panel | Lists what AI Brain enables when active |

## Fields

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `org_id` | text | Tenant scope (RLS-enforced) |
| `provider` | text | AI provider slug |
| `credentials_encrypted` | jsonb | AES-256-GCM blob `{v, nonce, ciphertext}` |
| `key_prefix` | text | First 8 chars of the API key for display |
| `judge_model` | text | LLM model for compliance evaluation |
| `embedding_model` | text | Embedding model for semantic search |
| `auto_action_confidence` | numeric | Auto-triage threshold (0.5–1.0) |
| `enabled` | boolean | Whether AI Brain is active |
| `updated_at` | timestamptz | Last modification timestamp |
| `updated_by` | text | User ID who last saved |

## Interlinks

| Direction | Target | How |
|---|---|---|
| Feeds | Trust Engine Dashboard | Trust scores computed by AI Brain |
| Feeds | Safety Firewall | Policy-check evaluations |
| Feeds | Guardrail Studio | Guardrail compliance scoring |
| Feeds | Evidence Vault | Intelligent evidence mapping |
| Reads | Integrations | Integration evidence for evaluation |
| Reads | Controls | Control definitions for compliance checks |
| Config for | `sentinel/services/compliance_evaluator.py` | Provider key + judge model |
| Config for | `sentinel/services/embedding_service.py` | Provider key + embedding model |

## Compliance

| Framework | Clause | Relevance |
|---|---|---|
| EU AI Act Art. 9 | Risk management system | Configures the automated risk evaluation engine |
| EU AI Act Art. 12 | Record-keeping | `updated_by` + `updated_at` for audit trail |
| ISO 42001 §8.2 | AI risk assessment | Provider and model selection for risk scoring |

## Operations

- **Migration**: `supabase/migrations/20260906000001_ai_brain_config.sql`
- **Edge Function**: `supabase/functions/ai-brain-config/index.ts`
- **Frontend service**: `dashboard/src/services/aiBrainConfigService.ts`
- **Frontend hook**: `dashboard/src/hooks/useAiBrainConfig.ts`
- **Settings tab**: `dashboard/src/pages/Settings.tsx` → AI Brain tab
- **Encryption**: shared `crypto.ts` (Edge Function) / `crypto.py` (Python)
- **RLS**: `ai_brain_config_org_isolation` policy on `org_id`
- **Route**: `/settings?tab=ai-brain`
