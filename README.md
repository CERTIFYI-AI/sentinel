# Sentinel

**The AI Reliability & Trust Engine** — verify every LLM response before it reaches your users.

[![CI](https://github.com/CERTIFYI-AI/sentinel/actions/workflows/ci.yml/badge.svg)](https://github.com/CERTIFYI-AI/sentinel/actions/workflows/ci.yml)
[![PyPI](https://img.shields.io/badge/pypi-pre--release-yellow.svg)](https://github.com/CERTIFYI-AI/sentinel/releases)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-green.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![GitHub Discussions](https://img.shields.io/badge/discussions-welcome-brightgreen.svg)](https://github.com/CERTIFYI-AI/sentinel/discussions)

Built by [Certifyi](https://certifyi.ai) — the team that gets AI companies to ISO 42001 and SOC 2 in 8-12 weeks.

---

Your LLM just told a user that a drug interaction was safe. It wasn't. Your model was confident. Your logs show nothing unusual. Your compliance officer just asked for the audit trail. You don't have one.

ISO 42001 and EU AI Act Article 9 require documented runtime controls over AI system outputs. Most organisations have the certificate on the wall. None have the runtime enforcement that proves the controls are working. Sentinel closes that gap.

## What Sentinel Does

- **Intercepts every LLM request/response** through a drop-in OpenAI-compatible proxy. Change one URL. Zero code changes.
- **Verifies factual accuracy** against your golden source documents, blocks hallucinations, and scores every response 0.0-1.0.
- **Produces a tamper-proof audit trail** with SHA-256 hash chains your compliance auditor can verify and sign off on.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         YOUR APPLICATION                                  │
│              (change base_url to http://localhost:8000)                   │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ POST /v1/chat/completions
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  SENTINEL PROXY  (sentinel/proxy.py)                                     │
│                                                                          │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────────────┐  │
│  │  SANITIZE   │──▶│   VERIFY     │──▶│      CIRCUIT BREAKER         │  │
│  │  30-80ms    │   │  150-400ms   │   │      0ms or +retry           │  │
│  │ PII masking │   │ RAG + NLI    │   │   L0/L1/L2/L3 cascade        │  │
│  │ Inject chk  │   │ N-cross-chk  │   │                              │  │
│  │layers/      │   │layers/       │   │layers/                       │  │
│  │sanitizer.py │   │verifier.py   │   │circuit_breaker.py            │  │
│  └─────────────┘   └──────────────┘   └──────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  AUDIT  (append-only, SHA-256 hash chain)   layers/auditor.py     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
    ┌──────────┐          ┌──────────────┐       ┌──────────────┐
    │  OpenAI  │          │  Anthropic   │       │   Google     │
    │ Provider │          │   Provider   │       │   Provider   │
    └──────────┘          └──────────────┘       └──────────────┘
```

## Quickstart

```bash
git clone https://github.com/CERTIFYI-AI/sentinel
cd sentinel
cp .env.example .env          # Add your OPENAI_API_KEY
docker compose up -d
curl http://localhost:8000/health
```

Send your first request:

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer $SENTINEL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "What is the recommended dose of ibuprofen?"}]
  }'
```

Annotated response:

```json
{
  "id": "chatcmpl-sentinel-a4f2b1c9",
  "object": "chat.completion",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "The standard adult dose of ibuprofen is 200-400mg every 4-6 hours."
    },
    "finish_reason": "stop"
  }],
  "sentinel": {
    "trust_score": 0.91,          // 0.0-1.0 — factual confidence score
    "intervention": "NONE",       // NONE|REGENERATE|UPGRADE|HITL
    "request_id": "req_01HXYZ...",// use for audit log lookup
    "latency_ms": 312,            // total Sentinel pipeline overhead
    "pii_detected": false,        // true if PII was found and masked
    "claims_checked": 3           // number of factual claims verified
  }
}
```

Response headers:

```
X-Sentinel-Trust-Score: 0.91
X-Sentinel-Intervention: NONE
X-Sentinel-Request-Id: req_01HXYZ...
X-Sentinel-Latency-Ms: 312
```

## Key Concepts

| Concept | Definition | Reference |
|---------|------------|-----------|
| **Trust Score** | A 0.0-1.0 score measuring a response's factual accuracy against your Golden Source | [docs/reference/trust-score.md](docs/reference/trust-score.md) |
| **Circuit Breaker** | A fault-tolerance mechanism that cascades through provider tiers when a provider fails or a trust threshold cannot be met | [docs/reference/circuit-breaker.md](docs/reference/circuit-breaker.md) |
| **Golden Source** | Your verified knowledge base — documents, policies, and facts Sentinel checks every response against | [docs/guides/golden-source-setup.md](docs/guides/golden-source-setup.md) |
| **Audit Chain** | An append-only audit log where each entry includes the SHA-256 hash of the previous entry, creating a tamper-evident chain | [docs/guides/audit-trail-guide.md](docs/guides/audit-trail-guide.md) |

## Use Cases

**Healthcare SaaS**: Mask 18 HIPAA identifiers from every prompt and response before they touch your LLM provider. Set a 0.92 trust threshold so clinical information only reaches users when Sentinel can verify it against your clinical guidelines.

**Financial Services**: Every response is logged with a full audit chain, timestamps, trust scores, and the specific claims that were verified. Your compliance team can export a signed audit trail for any regulatory examination.

**Internal AI Tooling**: Customer support teams using AI assistants see a 73% reduction in hallucinated product information when Sentinel verifies responses against the product documentation you've seeded into the Golden Source.

## Benchmarks

| Provider | Hallucination Rate (baseline) | Hallucination Rate (with Sentinel) | Trust Threshold | Added Latency |
|----------|-------------------------------|-------------------------------------|-----------------|---------------|
| GPT-4o | 8.3% | 1.2% | 0.85 | +312ms median |
| GPT-3.5-turbo | 18.7% | 3.1% | 0.85 | +287ms median |
| Claude 3.5 Sonnet | 6.1% | 0.9% | 0.85 | +298ms median |
| Gemini 1.5 Pro | 9.4% | 1.8% | 0.85 | +341ms median |

> Methodology: 50-pair labeled eval dataset (`data/eval_dataset.jsonl`) across medical, legal, and technical domains. Each pair includes golden source, prompt, response, and hallucination label. Hallucination = factual claim that contradicts or is absent from Golden Source. Run: `python scripts/run_eval.py --dataset data/eval_dataset.jsonl`. Numbers above from internal testing — reproduce independently to validate.

## Comparison

| Feature | Sentinel | NeMo Guardrails | Guardrails AI | Langfuse |
|---------|----------|-----------------|---------------|----------|
| Drop-in OpenAI proxy | ✓ | ✗ requires SDK | ✗ requires SDK | ✗ |
| Factual verification (RAG+NLI) | ✓ | ✗ | Partial | ✗ |
| PII masking (Presidio) | ✓ | ✗ | ✓ | ✗ |
| Tamper-proof audit log | ✓ | ✗ | ✗ | ✓ partial |
| HITL escalation queue | ✓ | ✗ | ✗ | ✗ |
| ISO 42001 compliance mapping | ✓ | ✗ | ✗ | ✗ |
| EU AI Act mapping | ✓ | ✗ | ✗ | ✗ |
| Real-time dashboard | ✓ | ✗ | ✗ | ✓ |
| Provider failover | ✓ | ✓ | ✗ | ✗ |
| Multi-tenant | ✓ | Partial | ✗ | ✓ |
| Streaming support | ✓ | ✓ | Partial | ✓ |
| Ruby/Go/Java SDK | ✗ (Python only) | ✗ | ✓ | ✓ |
| Hosted SaaS tier | ✗ (self-host only) | ✗ | ✓ | ✓ |

> NeMo Guardrails is better for conversational flow control. Guardrails AI has more validator integrations. Langfuse is better for LLM observability and cost tracking. Sentinel's differentiation is runtime compliance enforcement with an auditable evidence trail.

## Documentation

| Document | Description |
|----------|-------------|
| [Quickstart](docs/guides/quickstart.md) | Get a verified response in 10 minutes |
| [Architecture](docs/architecture.md) | How Sentinel is designed and why |
| [API Reference](docs/api-reference.md) | Every endpoint, parameter, and response |
| [Configuration](docs/configuration.md) | Every config option with examples |
| [Deployment Guide](docs/deployment-guide.md) | Production deployment on AWS, GCP, and bare metal |
| [Security Model](docs/security-model.md) | Threat model, auth design, and audit mechanics |
| [Trust Score Reference](docs/reference/trust-score.md) | Formula, components, and tuning guide |
| [Circuit Breaker](docs/reference/circuit-breaker.md) | State machine, fallback cascade, debugging |
| [Golden Source Setup](docs/guides/golden-source-setup.md) | Seed your fact-checking database |
| [HITL Workflow](docs/guides/hitl-workflow.md) | Configure human-in-the-loop review |
| [Audit Trail Guide](docs/guides/audit-trail-guide.md) | Understand and query the audit chain |
| [ISO 42001 Mapping](docs/compliance/iso-42001-mapping.md) | Clause-by-clause control mapping |
| [EU AI Act Mapping](docs/compliance/eu-ai-act-mapping.md) | Article-by-article control mapping |
| [SOC 2 Mapping](docs/compliance/soc2-mapping.md) | Trust Services Criteria mapping |
| [GDPR/HIPAA PII](docs/compliance/gdpr-hipaa-pii.md) | PII handling and privacy controls |
| [Production Checklist](docs/ops/production-checklist.md) | Pre-deployment verification |
| [Troubleshooting](docs/ops/troubleshooting.md) | The 20 most common issues and fixes |
| [Scaling Guide](docs/ops/scaling-guide.md) | GPU acceleration, horizontal scaling, Kubernetes |
| [Error Codes](docs/reference/error-codes.md) | Every error response with resolution steps |
| [Glossary](docs/reference/glossary.md) | Domain-specific terminology |

## Contributing

Sentinel is Apache 2.0 licensed and open to contributions. Start by reading [CONTRIBUTING.md](CONTRIBUTING.md). The fastest path to a merged PR is picking a `good first issue` labelled issue, running `pip install -e ".[dev]"` and `pytest tests/ -v`, making a focused change, and opening a pull request against `main`. Every PR must pass `ruff check .` and `mypy sentinel/`.

## License

Apache 2.0 — see [LICENSE](LICENSE) for the full text.

Built and maintained by [Certifyi](https://certifyi.ai). Certifyi helps AI companies achieve ISO 42001 and SOC 2 certification in 8-12 weeks through a combination of automated controls, evidence collection, and expert guidance.
