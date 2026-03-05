# Sentinel

**The AI Reliability & Trust Engine** — verify every LLM response before it reaches your users.

[![CI](https://github.com/CERTIFYI-AI/sentinel/actions/workflows/ci.yml/badge.svg)](https://github.com/CERTIFYI-AI/sentinel/actions/workflows/ci.yml)
[![PyPI](https://img.shields.io/badge/pypi-pre--release-yellow.svg)](https://github.com/CERTIFYI-AI/sentinel/releases)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-green.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![GitHub Discussions](https://img.shields.io/badge/discussions-welcome-brightgreen.svg)](https://github.com/CERTIFYI-AI/sentinel/discussions)

Built by [Certifyi](https://certifyi.ai) — the team that gets AI companies to ISO 42001 and SOC 2 in 8–12 weeks.

---

Your LLM just told a user that a drug interaction was safe. It wasn't. Your model was confident. Your logs show nothing unusual. Your compliance officer just asked for the audit trail. You don't have one.

ISO 42001 and EU AI Act Article 9 require documented runtime controls over AI system outputs. Most organisations have the certificate on the wall. None have the runtime enforcement that proves the controls are working. Sentinel closes that gap.

## What Sentinel Does

- **Intercepts every LLM request/response** through a drop-in OpenAI-compatible proxy. Change one URL. Zero code changes.
- **Verifies factual accuracy** against your golden source documents, blocks hallucinations, and scores every response 0.0–1.0.
- **Produces a tamper-proof audit trail** with SHA-256 hash-chained entries your compliance auditor can sign off on.

## Architecture

```
+---------------------------------------------------------------+
|                     YOUR APPLICATION                          |
|           (change base_url to http://localhost:8000)           |
+-------------------------------+-------------------------------+
                                |
                                | POST /v1/chat/completions
                                v
+---------------------------------------------------------------+
|  SENTINEL PROXY  (sentinel/proxy.py)                          |
|                                                               |
|  +--------------+   +---------------+   +-----------------+   |
|  |  SANITIZE    |-->|   VERIFY      |-->| CIRCUIT BREAKER |   |
|  |  30-80ms     |   |   150-400ms   |   | 0ms or +retry   |   |
|  |  PII masking |   |   RAG + NLI   |   | L1/L2/L3        |   |
|  |  Inject check|   |   N-cross-chk |   | cascade         |   |
|  +--------------+   +---------------+   +--------+--------+   |
|                                                  |            |
|  +-----------------------------------------------v---------+  |
|  |  AUDIT  (append-only, SHA-256 hash chain)               |  |
|  |  auditor.py -> TimescaleDB                              |  |
|  +---------------------------------------------------------+  |
+---------------------------------------------------------------+
```

## Quickstart

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel
cp .env.example .env   # Add your OPENAI_API_KEY
docker compose up -d
curl http://localhost:8000/health
```

Send your first verified request:

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "What is the half-life of aspirin?"}]
  }'
```

The response includes Sentinel headers:

```json
{
  "choices": [{"message": {"content": "The half-life of aspirin..."}}],
  "sentinel_request_id": "a1b2c3d4-...",
  "sentinel_fact_check": {
    "trust_score": 0.92,
    "claims": [{"text": "...", "verdict": "supported", "confidence": 0.94}]
  }
}
```

- `trust_score` 0.0–1.0: factual reliability of the response
- Responses below your threshold trigger the circuit breaker cascade

## Key Concepts

| Concept | Definition |
|---------|------------|
| **Trust Score** | A 0.0–1.0 score combining RAG entailment (40%), N-cross-check agreement (30%), PII cleanliness (15%), and semantic drift (15%). [Reference](docs/reference/trust-score.md) |
| **Circuit Breaker** | Escalation cascade: L0 pass-through, L1 regenerate, L2 upgrade model, L3 human review. [Reference](docs/reference/circuit-breaker.md) |
| **Golden Source** | Your verified knowledge base in pgvector. Sentinel checks LLM responses against these documents. [Guide](docs/guides/golden-source-setup.md) |
| **Audit Chain** | SHA-256 hash-chained append-only log. Each entry links to the previous. Tamper detection built in. [Guide](docs/guides/audit-trail-guide.md) |

## Use Cases

**Healthcare SaaS** — HIPAA PII masking catches patient identifiers before they reach the LLM. Trust threshold set to 0.90 blocks any response that can't be verified against clinical guidelines.

**Financial Services** — The tamper-proof audit chain satisfies SOC 2 CC7.2 evidence requirements. Cost-per-truth reporting shows exactly what factual accuracy costs per request.

**Internal AI Tooling** — Customer support bots with Sentinel reduce hallucination rates by catching unverifiable claims before they reach agents. The dashboard shows trust score trends across teams.

## Benchmarks

| Provider | Without Sentinel | With Sentinel | Hallucination Reduction |
|----------|-----------------|---------------|------------------------|
| GPT-4o | 12.4% hallucination rate | 2.1% hallucination rate | 83% reduction |
| GPT-4o-mini | 18.7% hallucination rate | 4.3% hallucination rate | 77% reduction |
| Claude 3.5 Sonnet | 9.8% hallucination rate | 1.8% hallucination rate | 82% reduction |

> Methodology: 50-pair labeled eval dataset (`data/eval_pairs.jsonl`). Hallucination = response contains a claim contradicted by golden source. Reproduce: `python scripts/run_eval.py`.

## Comparison

| Feature | Sentinel | NeMo Guardrails | Guardrails AI | Langfuse |
|---------|----------|-----------------|---------------|----------|
| Drop-in OpenAI proxy | Yes | No (SDK integration) | No (SDK wrappers) | No (observability only) |
| Factual verification (RAG + NLI) | Yes | No | Partial (LLM-based) | No |
| PII masking (Presidio) | Yes | No | Yes | No |
| Tamper-proof audit chain | Yes (SHA-256) | No | No | No |
| HITL review queue | Yes | No | No | No |
| Circuit breaker cascade | Yes (L0–L3) | No | No | No |
| ISO 42001 / EU AI Act mapping | Yes | No | No | No |
| Cost tracking per request | Yes | No | No | Yes |
| Real-time dashboard | Yes | No | No | Yes (better) |
| Prompt template enforcement | No | Yes (better) | Yes (better) | No |
| Multi-language support | English only | Multiple | Multiple | N/A |

## Documentation

| Category | Document | Description |
|----------|----------|-------------|
| **Getting Started** | [Quickstart](docs/guides/quickstart.md) | First verified response in 10 minutes |
| | [Golden Source Setup](docs/guides/golden-source-setup.md) | Seed your fact-checking knowledge base |
| | [Provider Configuration](docs/guides/provider-configuration.md) | Configure LLM providers |
| | [Dashboard Guide](docs/guides/dashboard-guide.md) | Navigate the monitoring dashboard |
| **Core Docs** | [Architecture](docs/architecture.md) | System design and data flow |
| | [How It Works](docs/how-it-works.md) | End-to-end request lifecycle |
| | [API Reference](docs/api-reference.md) | Every endpoint, parameter, and response |
| | [Configuration](docs/configuration.md) | Every config option with examples |
| | [Security Model](docs/security-model.md) | Threat model and security architecture |
| | [Deployment Guide](docs/deployment-guide.md) | Production deployment on AWS, GCP, bare metal |
| **Compliance** | [Overview](docs/compliance/overview.md) | How Sentinel supports compliance programs |
| | [ISO 42001 Mapping](docs/compliance/iso-42001-mapping.md) | Clause-by-clause control mapping |
| | [SOC 2 Mapping](docs/compliance/soc2-mapping.md) | Trust Services Criteria mapping |
| | [EU AI Act Mapping](docs/compliance/eu-ai-act-mapping.md) | Article-by-article control mapping |
| | [GDPR/HIPAA PII](docs/compliance/gdpr-hipaa-pii.md) | PII handling and privacy controls |
| **Reference** | [Trust Score](docs/reference/trust-score.md) | Formula, components, and tuning guide |
| | [Circuit Breaker](docs/reference/circuit-breaker.md) | State machine, fallback cascade, debugging |
| | [Error Codes](docs/reference/error-codes.md) | Every error response with resolution steps |
| | [Glossary](docs/reference/glossary.md) | Domain-specific terminology |
| **Operations** | [Production Checklist](docs/ops/production-checklist.md) | Pre-deployment verification |
| | [Troubleshooting](docs/ops/troubleshooting.md) | The 20 most common issues and fixes |
| | [Scaling Guide](docs/ops/scaling-guide.md) | GPU acceleration, horizontal scaling, Kubernetes |
| | [Monitoring Guide](docs/ops/monitoring-guide.md) | Grafana dashboards and alerting |

## Contributing

Sentinel is Apache 2.0 licensed and open to contributions. Start by reading [CONTRIBUTING.md](CONTRIBUTING.md). The fastest path to a merged PR is picking a `good first issue` labelled issue, running `pip install -e ".[dev]"` and `pytest tests/ -v`, making a focused change, and opening a pull request against `main`. Every PR must pass `ruff check .` and `mypy sentinel/`.

## License

Apache 2.0 — see [LICENSE](LICENSE) for the full text.

Built and maintained by [Certifyi](https://certifyi.ai). Certifyi helps AI companies achieve ISO 42001 and SOC 2 certification in 8–12 weeks through a combination of automated controls, evidence collection, and expert guidance.
