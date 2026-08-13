# Runbooks

Step-by-step procedures to follow during an incident. Both documents cover
disaster recovery for different deployment topologies.

| Runbook | When to use it |
|---|---|
| [dr-restore.md](dr-restore.md) | Self-hosted stack: declare the incident, restore Postgres, repoint the fleet, validate, and the monthly restore test |
| [dr-runbook.md](dr-runbook.md) | Managed stack (Supabase + Cloudflare): severity classification, database/worker/edge-function recovery, communication tree, post-recovery verification, backup schedule |

## Related

- [Backup and restore](../backup-restore.md)
- [Observability, rate limits and DR targets](../observability/ARCHITECTURE.md)
