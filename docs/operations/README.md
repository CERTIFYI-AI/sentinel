# Operations

Running Sentinel in production: getting it deployed, watching it, scaling it,
recovering it, and shipping new versions of it.

| Document | What it covers |
|---|---|
| [deployment.md](deployment.md) | Docker Compose, bare metal, AWS and GCP deployments; reverse proxy config; environment variable reference; ML model pre-download; smoke test; upgrades |
| [production-checklist.md](production-checklist.md) | The gate to clear before serving production traffic |
| [monitoring.md](monitoring.md) | Prometheus scrape config, key metrics, Grafana dashboards, alert rules, Slack routing, health endpoints, log aggregation |
| [scaling.md](scaling.md) | Baseline performance, horizontal and vertical scaling, GPU acceleration, Kubernetes/Helm, PostgreSQL and Redis tuning, load testing, capacity planning |
| [backup-restore.md](backup-restore.md) | What to back up (audit log, Golden Source, tenant config) and how to restore it |

## Runbooks

| Document | What it covers |
|---|---|
| [runbooks/README.md](runbooks/README.md) | Index of incident and recovery runbooks |

## Subsystems

| Document | What it covers |
|---|---|
| [observability/ARCHITECTURE.md](observability/ARCHITECTURE.md) | Tracing from UI to Postgres, per-org rate limits, and documented RTO/RPO targets |
| [release-engineering/ARCHITECTURE.md](release-engineering/ARCHITECTURE.md) | Reproducible signed releases: SBOM, Sigstore signatures, SLSA provenance, semantic-release |

## Related

- [Troubleshooting](../getting-started/troubleshooting.md)
- [Metric definitions](../reference/metric-definitions.md)
- [CI/CD integration](../guides/ci-cd-integration.md)
