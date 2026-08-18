# Sentinel AI GRC — Disaster Recovery Runbook

**Owner:** CISO Office  
**Version:** 1.0  
**Last Updated:** 2026-04-21  
**RTO:** 4 hours | **RPO:** 1 hour

## 1. Incident Severity Classification

| Level | Trigger | RTO |
|-------|---------|-----|
| P0 | Full platform outage | 1h |
| P1 | Data loss or breach | 2h |
| P2 | Feature degradation | 4h |
| P3 | Performance degradation | 8h |

## 2. Recovery Procedures

### 2.1 Database Recovery (Supabase)

```
1. Navigate to Supabase Dashboard → Project vhparvughsygyknblkzt
2. Settings → Database → Point-in-Time Recovery
3. Select restore point (closest snapshot before incident)
4. Confirm recovery — estimated 15-30 minutes for 50GB
5. Verify RLS policies intact: SELECT * FROM pg_policies WHERE schemaname='public'
6. Verify audit_events hash chain: SELECT verify_hash_chain() (if function exists)
```

### 2.2 Worker / Frontend Recovery (Cloudflare)

```
1. wrangler rollback --env production --deployment-id <prev-id>
   (Find deployment ID: wrangler deployments list)
2. Verify: curl -I https://1shield-oss.certifyi.ai/healthz
3. If worker crashed: wrangler tail --env production (inspect logs)
```

### 2.3 Supabase Edge Functions

```
supabase functions deploy --project-ref vhparvughsygyknblkzt
```

## 3. Communication Tree

1. Notify incident commander (PagerDuty escalation policy: SENTINEL-P0)
2. CISO + CTO within 15 minutes
3. Regulatory notification within 72h if personal data affected (GDPR Art.33)
4. Customer notification per DPA obligations

## 4. Post-Recovery Verification Checklist

- [ ] All Supabase tables accessible with RLS enforced
- [ ] Audit log hash chain unbroken
- [ ] All 8 demo personas login successfully
- [ ] Evidence vault hashes verified
- [ ] Webhook deliveries queue draining
- [ ] Lighthouse LCP < 1.5s p75

## 5. Backup Schedule

| Asset | Frequency | Retention | Location |
|-------|-----------|-----------|----------|
| Supabase DB | Hourly (PITR) | 7 days | Supabase managed |
| Supabase DB | Daily snapshot | 30 days | Supabase managed |
| Worker bundles | Every deploy | 10 versions | Cloudflare |
| Evidence artifacts | On upload | 7 years | Supabase Storage |

## 6. Contact Escalation

- On-call: PagerDuty policy SENTINEL-P0
- Supabase Support: enterprise@supabase.io (SLA: 1h response)
- Cloudflare Support: enterprise support ticket via dashboard
