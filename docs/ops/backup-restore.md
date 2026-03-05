# Backup and Restore

> **Purpose**: Procedures for backing up and restoring Sentinel data, including audit logs, Golden Source, and tenant configuration.

## What to Back Up

| Component | Data | Priority | Method |
|---|---|---|---|
| PostgreSQL | Audit log, Golden Source, tenant config, HITL queue | Critical | pg_dump or continuous archiving |
| Redis | Circuit breaker state, rate limit counters | Low | Not required (ephemeral data, rebuilds automatically) |
| Configuration | Environment variables, policy JSON | Critical | Version control (Git) |
| ML Models | NLI, embedding, spaCy models | Low | Re-downloaded on startup from HuggingFace |

## PostgreSQL Backup

### Logical Backup (pg_dump)

Suitable for databases under 50GB.

```bash
# Full backup
pg_dump -h localhost -U sentinel -d sentinel \
  --format=custom \
  --compress=9 \
  -f sentinel-backup-$(date +%Y%m%d).dump

# Backup specific tables
pg_dump -h localhost -U sentinel -d sentinel \
  --format=custom \
  --compress=9 \
  -t sentinel_audit_log \
  -t sentinel_golden_source \
  -t sentinel_tenants \
  -t sentinel_hitl_queue \
  -f sentinel-tables-$(date +%Y%m%d).dump
```

### Continuous Archiving (WAL)

For production deployments. Provides point-in-time recovery.

```bash
# postgresql.conf
archive_mode = on
archive_command = 'aws s3 cp %p s3://sentinel-backups/wal/%f'
wal_level = replica
```

### Automated Daily Backup

```yaml
# .github/workflows/daily-backup.yml
name: Daily Database Backup

on:
  schedule:
    - cron: '0 3 * * *'  # 03:00 UTC daily

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Run pg_dump
        run: |
          PGPASSWORD=${{ secrets.DB_PASSWORD }} pg_dump \
            -h ${{ secrets.DB_HOST }} \
            -U sentinel -d sentinel \
            --format=custom --compress=9 \
            -f sentinel-$(date +%Y%m%d).dump

      - name: Upload to S3
        run: |
          aws s3 cp sentinel-$(date +%Y%m%d).dump \
            s3://${{ secrets.BACKUP_BUCKET }}/daily/

      - name: Delete backups older than 30 days
        run: |
          aws s3 ls s3://${{ secrets.BACKUP_BUCKET }}/daily/ | \
            awk '{print $4}' | \
            while read file; do
              date_str=$(echo $file | grep -o '[0-9]\{8\}')
              if [ $(date -d "$date_str" +%s) -lt $(date -d '30 days ago' +%s) ]; then
                aws s3 rm s3://${{ secrets.BACKUP_BUCKET }}/daily/$file
              fi
            done
```

## Restore Procedures

### Full Restore from pg_dump

```bash
# Stop Sentinel instances
docker compose stop sentinel

# Restore database
pg_restore -h localhost -U sentinel -d sentinel \
  --clean --if-exists \
  sentinel-backup-20250115.dump

# Verify audit log integrity
curl http://localhost:8000/api/audit/integrity \
  -H "Authorization: Bearer $TOKEN"

# Restart Sentinel
docker compose start sentinel
```

### Point-in-Time Recovery

With WAL archiving enabled:

```bash
# recovery.conf (PostgreSQL < 12) or postgresql.conf (>= 12)
restore_command = 'aws s3 cp s3://sentinel-backups/wal/%f %p'
recovery_target_time = '2025-01-15 10:30:00 UTC'
```

### Golden Source Only

Restore Golden Source without affecting audit logs:

```bash
pg_restore -h localhost -U sentinel -d sentinel \
  --data-only \
  -t sentinel_golden_source \
  sentinel-backup-20250115.dump
```

After restoring Golden Source, re-index the vector embeddings:

```sql
REINDEX INDEX idx_golden_source_embedding;
```

## Audit Log Archival

Audit logs grow continuously and cannot be deleted. Archive old partitions to reduce active database size.

### Archive a Monthly Partition

```sql
-- Export partition to file
COPY (
  SELECT * FROM sentinel_audit_log
  WHERE timestamp >= '2024-12-01' AND timestamp < '2025-01-01'
) TO '/tmp/audit-2024-12.csv' WITH CSV HEADER;

-- Upload to object storage
-- aws s3 cp /tmp/audit-2024-12.csv s3://sentinel-archives/audit/

-- Detach partition (TimescaleDB)
SELECT drop_chunks('sentinel_audit_log', older_than => INTERVAL '6 months');
```

Compressed partitions remain queryable but use 80-90% less storage.

## Disaster Recovery

### Recovery Time Objectives

| Scenario | RTO | RPO | Method |
|---|---|---|---|
| Sentinel instance failure | < 1 minute | 0 | Auto-restart, load balancer failover |
| PostgreSQL failure | < 15 minutes | < 5 minutes | Standby replica promotion |
| Full data centre failure | < 1 hour | < 1 hour | Cross-region backup restore |
| Data corruption | < 30 minutes | Point-in-time | WAL-based PITR |

### Verification

After any restore, verify:

1. **Audit log integrity**: `GET /api/audit/integrity` returns `valid: true`.
2. **Golden Source**: Run a test query to confirm vector search returns results.
3. **Tenant configuration**: Verify policies are intact via `GET /api/tenants`.
4. **Health check**: `GET /health` returns all components healthy.

## Next Steps

- [Monitoring](monitoring.md) — Set up alerts for backup failures.
- [Scaling](scaling.md) — Database sizing for backup planning.
- [Evidence Export](../compliance/evidence-export.md) — Export compliance data before archival.
