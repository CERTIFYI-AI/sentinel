# Scaling Guide

This guide covers GPU acceleration, horizontal scaling, and Kubernetes deployment for Sentinel in high-throughput production environments.

## Scaling Dimensions

Sentinel has three main bottlenecks at scale:

1. **Proxy throughput** — FastAPI/uvicorn concurrency
2. **Verifier latency** — NLI model inference time
3. **Database write throughput** — Audit log append rate

## Horizontal Scaling (Docker Compose)

```yaml
# docker-compose.yml
services:
  sentinel:
    image: certifyi/sentinel:latest
    deploy:
      replicas: 4
    environment:
      - SENTINEL_WORKERS=4
```

Add a load balancer (nginx or Traefik) in front:

```yaml
  nginx:
    image: nginx:alpine
    ports:
      - "8000:80"
    volumes:
      - ./configs/nginx.conf:/etc/nginx/nginx.conf
```

## GPU Acceleration for NLI

The verifier's NLI model is the primary CPU/GPU bottleneck. Enable GPU acceleration:

```yaml
# configs/sentinel.yaml
verifier:
  nli_device: cuda  # or cpu
  nli_batch_size: 32
  nli_model: cross-encoder/nli-deberta-v3-base
```

```yaml
# docker-compose.yml
  sentinel:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

With GPU, NLI inference drops from ~150ms to ~15ms per claim.

## Kubernetes Deployment

Helmchart is in `scripts/helm/sentinel/`. Basic deployment:

```bash
# Install with Helm
helm install sentinel ./scripts/helm/sentinel \
  --set image.tag=latest \
  --set replicaCount=3 \
  --set resources.requests.memory=2Gi \
  --set resources.requests.cpu=1000m \
  --set postgresql.enabled=true \
  --set redis.enabled=true
```

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sentinel
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sentinel
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## TimescaleDB Scaling

For high audit log write rates (> 1000/s):

1. Enable TimescaleDB compression:
```sql
SELECT add_compression_policy('audit_log', INTERVAL '7 days');
```

2. Use continuous aggregates for dashboard queries:
```sql
CREATE MATERIALIZED VIEW trust_score_hourly
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 hour', created_at) as hour,
       AVG(trust_score) as avg_trust_score,
       COUNT(*) as request_count
FROM audit_log
GROUP BY hour;
```

3. For very high write rates, use TimescaleDB distributed hypertables.

## pgvector Scaling

For large golden source datasets (> 100K documents):

```yaml
# configs/sentinel.yaml
verifier:
  pgvector_index_type: ivfflat  # or hnsw
  pgvector_lists: 100  # IVFFlat: sqrt(n_rows)
  top_k: 5  # Retrieved documents per query
```

```sql
-- Create IVFFlat index for faster similarity search
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Performance Targets

| Configuration | P50 Latency | P95 Latency | Max QPS |
|--------------|-------------|-------------|----------|
| Single instance, CPU | 200ms | 600ms | 50 |
| 4 replicas, CPU | 200ms | 600ms | 200 |
| 4 replicas, GPU | 50ms | 150ms | 800 |
| K8s autoscale, GPU | 50ms | 200ms | 5000+ |

> Latency is for L0 (pass-through). L1/L2 add 200–1500ms.

## Related Documents

- [Deployment Guide](../deployment-guide.md)
- [Monitoring Guide](./monitoring-guide.md)
- [Production Checklist](./production-checklist.md)
