# CI/CD Integration

> **Time**: 20 minutes. **Outcome**: Sentinel integrated into your CI/CD pipeline with automated policy validation and Golden Source updates.

## Overview

Sentinel fits into CI/CD pipelines at two points:

1. **Pre-deployment**: Validate configuration, policies, and Golden Source integrity.
2. **Post-deployment**: Run smoke tests against the live Sentinel instance.

This guide covers GitHub Actions. Adapt the workflow steps for GitLab CI, Jenkins, or other platforms.

## GitHub Actions Workflow

Create `.github/workflows/sentinel-ci.yml`:

```yaml
name: Sentinel CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  SENTINEL_IMAGE: ghcr.io/certifyi-ai/sentinel:latest
  POSTGRES_PASSWORD: ci_test_password

jobs:
  validate:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_DB: sentinel_test
          POSTGRES_PASSWORD: ${{ env.POSTGRES_PASSWORD }}
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Validate configuration
        run: python -m sentinel.config --validate
        env:
          DATABASE_URL: postgresql://postgres:${{ env.POSTGRES_PASSWORD }}@localhost:5432/sentinel_test
          REDIS_URL: redis://localhost:6379
          SENTINEL_SECRET_KEY: ci-test-secret-key-min-32-chars!!

      - name: Run migrations
        run: alembic upgrade head
        env:
          DATABASE_URL: postgresql://postgres:${{ env.POSTGRES_PASSWORD }}@localhost:5432/sentinel_test

      - name: Seed test Golden Source
        run: |
          python scripts/seed_golden_source.py \
            --input ./tests/fixtures/golden_source/ \
            --tenant-id test-tenant
        env:
          DATABASE_URL: postgresql://postgres:${{ env.POSTGRES_PASSWORD }}@localhost:5432/sentinel_test

      - name: Run unit tests
        run: pytest tests/ -v --tb=short
        env:
          DATABASE_URL: postgresql://postgres:${{ env.POSTGRES_PASSWORD }}@localhost:5432/sentinel_test
          REDIS_URL: redis://localhost:6379
          SENTINEL_SECRET_KEY: ci-test-secret-key-min-32-chars!!

      - name: Run integration tests
        run: pytest tests/integration/ -v --tb=short
        env:
          DATABASE_URL: postgresql://postgres:${{ env.POSTGRES_PASSWORD }}@localhost:5432/sentinel_test
          REDIS_URL: redis://localhost:6379
          SENTINEL_SECRET_KEY: ci-test-secret-key-min-32-chars!!

  smoke-test:
    needs: validate
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Start Sentinel
        run: docker compose -f docker-compose.yml up -d

      - name: Wait for healthy
        run: |
          for i in $(seq 1 30); do
            if curl -sf http://localhost:8000/health; then
              echo "Sentinel is healthy"
              exit 0
            fi
            sleep 2
          done
          echo "Sentinel failed to start"
          exit 1

      - name: Run smoke tests
        run: |
          # Test chat completions endpoint
          RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST http://localhost:8000/v1/chat/completions \
            -H "Authorization: Bearer ${{ secrets.SENTINEL_API_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello"}]}')
          
          if [ "$RESPONSE" != "200" ]; then
            echo "Smoke test failed with status $RESPONSE"
            exit 1
          fi

      - name: Collect logs on failure
        if: failure()
        run: docker compose logs sentinel
```

## Configuration Validation

The `--validate` flag checks:

- All required environment variables are set.
- `DATABASE_URL` is a valid PostgreSQL connection string.
- `REDIS_URL` is reachable (warns if not, does not fail).
- `SENTINEL_SECRET_KEY` is at least 32 characters.
- Provider API keys are present for configured providers.

Validation exits with code 0 on success, 1 on failure. Error messages indicate the specific problem.

## Golden Source Updates in CI

Automate Golden Source updates when documentation changes:

```yaml
# .github/workflows/golden-source-sync.yml
name: Sync Golden Source

on:
  push:
    branches: [main]
    paths:
      - 'docs/knowledge-base/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Upload changed documents
        run: |
          python scripts/seed_golden_source.py \
            --input ./docs/knowledge-base/ \
            --api-url ${{ secrets.SENTINEL_API_URL }} \
            --api-key ${{ secrets.SENTINEL_API_KEY }} \
            --tenant-id ${{ secrets.SENTINEL_TENANT_ID }}
```

This workflow triggers only when files in `docs/knowledge-base/` change. The seed script computes checksums and skips unchanged documents.

## Testing Retrieval Quality

Add a retrieval quality check to your pipeline:

```bash
# scripts/test_retrieval.py
python scripts/test_retrieval.py \
  --queries ./tests/fixtures/retrieval_queries.json \
  --min-similarity 0.75 \
  --min-coverage 0.80
```

The test file format:

```json
[
  {
    "query": "What is the refund policy?",
    "expected_doc_ids": ["refund-policy-v2", "returns-faq"],
    "min_score": 0.80
  }
]
```

The script queries the Golden Source and verifies:
- Each query returns at least one expected document.
- Similarity scores meet the minimum threshold.
- Coverage (percentage of expected docs found) meets the minimum.

## Policy Validation in Pull Requests

Validate policy changes before merge:

```yaml
# Add to your CI workflow
- name: Validate policy JSON
  run: |
    python -c "
    import json, sys
    with open('config/policy.json') as f:
        policy = json.load(f)
    thresholds = policy['trust_thresholds']
    assert thresholds['pass'] > thresholds['regenerate'], 'pass must exceed regenerate'
    assert thresholds['regenerate'] > thresholds['upgrade'], 'regenerate must exceed upgrade'
    assert thresholds['upgrade'] > thresholds['hitl'], 'upgrade must exceed hitl'
    assert thresholds['hitl'] > thresholds['block'], 'hitl must exceed block'
    assert 0 <= thresholds['block'] <= 1, 'block must be between 0 and 1'
    print('Policy validation passed')
    "
```

This catches common mistakes like inverted thresholds or out-of-range values.

## Docker Image Build

```yaml
# .github/workflows/docker-publish.yml
name: Build and Publish

on:
  release:
    types: [published]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/certifyi-ai/sentinel:${{ github.event.release.tag_name }}
            ghcr.io/certifyi-ai/sentinel:latest
```

## Environment Promotion

Recommended pipeline stages:

| Stage | Trigger | Actions |
|---|---|---|
| `test` | Every push | Lint, unit tests, config validation |
| `staging` | Merge to main | Deploy to staging, integration tests, smoke tests |
| `production` | Manual approval or tag | Deploy to production, health check, canary verification |

Use environment-specific configuration files:

```
config/
  staging.env
  production.env
```

Never commit secrets to configuration files. Use CI/CD secrets or a vault service.

## Rollback Strategy

If a deployment fails the smoke test:

1. The CI pipeline automatically rolls back to the previous container image.
2. Golden Source changes are not rolled back (they are additive).
3. Policy changes require a manual revert commit.

```yaml
- name: Rollback on failure
  if: failure()
  run: |
    docker compose pull sentinel
    docker compose up -d --force-recreate sentinel
```

## Next Steps

- [Monitoring](../operations/monitoring.md) — Set up alerts for failed deployments.
- [Scaling](../operations/scaling.md) — Configure auto-scaling based on CI metrics.
- [Writing Policies](writing-policies.md) — Create policies to validate in your pipeline.
