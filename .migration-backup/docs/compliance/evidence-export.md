# Evidence Export

> **Purpose**: Export audit data and compliance evidence in formats suitable for auditors and compliance tools.

## Export API

### Full Export

```bash
curl "http://localhost:8000/api/audit/export?from=2025-01-01&to=2025-01-31" \
  -H "Authorization: Bearer $TOKEN" \
  -o evidence-jan-2025.json
```

### Framework-Specific Export

```bash
# EU AI Act evidence package
curl "http://localhost:8000/api/audit/export?framework=eu-ai-act&from=2025-01-01&to=2025-01-31" \
  -H "Authorization: Bearer $TOKEN" \
  -o eu-ai-act-jan-2025.json

# ISO 42001 evidence package
curl "http://localhost:8000/api/audit/export?framework=iso-42001&from=2025-01-01&to=2025-01-31" \
  -H "Authorization: Bearer $TOKEN" \
  -o iso-42001-jan-2025.json

# SOC 2 evidence package
curl "http://localhost:8000/api/audit/export?framework=soc2&from=2025-01-01&to=2025-01-31" \
  -H "Authorization: Bearer $TOKEN" \
  -o soc2-jan-2025.json
```

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `from` | ISO 8601 date | Yes | Start of the export period (inclusive). |
| `to` | ISO 8601 date | Yes | End of the export period (inclusive). |
| `framework` | string | No | Filter by compliance framework. Values: `eu-ai-act`, `iso-42001`, `soc2`, `nist-ai-rmf`. |
| `format` | string | No | Output format. Values: `json` (default), `csv`, `parquet`. |
| `include_claims` | boolean | No | Include per-claim breakdowns. Default: `true`. |
| `include_integrity` | boolean | No | Run and include hash chain verification. Default: `false`. |

## Export Format

### JSON Structure

```json
{
  "export_metadata": {
    "generated_at": "2025-02-01T00:00:00Z",
    "period_start": "2025-01-01T00:00:00Z",
    "period_end": "2025-01-31T23:59:59Z",
    "framework": "eu-ai-act",
    "tenant_id": "your-tenant-id",
    "total_requests": 15234,
    "sentinel_version": "0.1.0"
  },
  "summary": {
    "trust_score": {
      "mean": 0.847,
      "median": 0.872,
      "p5": 0.612,
      "p95": 0.956,
      "std_dev": 0.089
    },
    "interventions": {
      "NONE": 12456,
      "REGENERATE": 1823,
      "UPGRADE": 567,
      "HITL": 234,
      "BLOCK": 154
    },
    "pii_detections": 342,
    "injection_blocks": 12,
    "golden_source_coverage": 0.89
  },
  "integrity": {
    "chain_valid": true,
    "entries_verified": 15234
  },
  "entries": [
    {
      "request_id": "req_abc123def456",
      "timestamp": "2025-01-15T10:30:00Z",
      "trust_score": 0.87,
      "intervention": "NONE",
      "model_used": "gpt-4o-mini",
      "pii_detected": false,
      "claim_scores": [...]
    }
  ]
}
```

### CSV Format

The CSV export flattens the JSON structure. Each row is one audit entry. Claim scores are excluded from CSV format (use JSON for claim-level detail).

```bash
curl "http://localhost:8000/api/audit/export?from=2025-01-01&to=2025-01-31&format=csv" \
  -H "Authorization: Bearer $TOKEN" \
  -o evidence-jan-2025.csv
```

## Automated Monthly Export

Schedule monthly exports with a cron job or CI workflow:

```yaml
# .github/workflows/monthly-evidence-export.yml
name: Monthly Evidence Export

on:
  schedule:
    - cron: '0 2 1 * *'  # First day of each month at 02:00 UTC

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate date range
        id: dates
        run: |
          echo "from=$(date -d 'last month' +%Y-%m-01)" >> $GITHUB_OUTPUT
          echo "to=$(date -d 'last day of last month' +%Y-%m-%d)" >> $GITHUB_OUTPUT

      - name: Export evidence
        run: |
          curl "${{ secrets.SENTINEL_API_URL }}/api/audit/export?from=${{ steps.dates.outputs.from }}&to=${{ steps.dates.outputs.to }}&include_integrity=true" \
            -H "Authorization: Bearer ${{ secrets.SENTINEL_API_TOKEN }}" \
            -o evidence-${{ steps.dates.outputs.from }}.json

      - name: Upload to S3
        run: |
          aws s3 cp evidence-${{ steps.dates.outputs.from }}.json \
            s3://${{ secrets.EVIDENCE_BUCKET }}/monthly/
```

## Auditor Handoff

When providing evidence to an auditor:

1. Export with `include_integrity=true` to include hash chain verification.
2. Provide the JSON export (not CSV) for claim-level detail.
3. Include the `export_metadata` section showing the period and Sentinel version.
4. Run `GET /api/audit/integrity` separately and share the result as independent verification.

The integrity check proves that no audit entries were modified between generation and export.

## Data Sensitivity

Exported data does not contain:
- Raw prompts (only SHA-256 hashes).
- Raw responses (only SHA-256 hashes).
- PII values (only entity types detected).
- API keys or credentials.

Exported data does contain:
- Trust Scores and claim-level breakdowns.
- Model names and provider information.
- Intervention decisions and timing.
- Tenant IDs and request IDs.

Treat exports as confidential. Store them in access-controlled storage.

## Next Steps

- [Audit Log Schema](audit-log-schema.md) — Understand every field in the export.
- [Frameworks](frameworks.md) — Map exported evidence to compliance requirements.
- [Backup and Restore](../ops/backup-restore.md) — Archive exports for long-term retention.
