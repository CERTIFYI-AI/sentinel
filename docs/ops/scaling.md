# Scaling

> **Purpose**: Capacity planning, horizontal scaling, and performance tuning for production Sentinel deployments.

## Baseline Performance

Single Sentinel instance on a 4-core CPU with 4GB RAM:

| Metric | CPU Only | GPU (T4) |
|---|---|---|
| Requests per minute | ~200 | ~2,000 |
| P50 latency | 800ms | 200ms |
| P95 latency | 2,500ms | 600ms |
| Memory usage | 2.1GB | 3.5GB |

The bottleneck is NLI inference (DeBERTa). All other layers add less than 50ms combined.

## Horizontal Scaling

Sentinel is stateless. Scale by running multiple instances behind a load balancer.

### Requirements for Multi-Instance

1. **Redis** is required for shared circuit breaker state and rate limiting.
2. **PostgreSQL** handles concurrent writes from multiple instances.
3. A **load balancer** distributes requests across instances.

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sentinel
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sentinel
  template:
    metadata:
      labels:
        app: sentinel
    spec:
      containers:
        - name: sentinel
          image: ghcr.io/certifyi-ai/sentinel:latest
          resources:
            requests:
              cpu: "2"
              memory: "2Gi"
            limits:
              cpu: "4"
              memory: "4Gi"
          ports:
            - containerPort: 8000
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 15
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 30
          envFrom:
            - secretRef:
                name: sentinel-secrets
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sentinel-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sentinel
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Scaling Triggers

| Metric | Scale Up When | Scale Down When |
|---|---|---|
| CPU utilization | > 70% for 2 minutes | < 30% for 5 minutes |
| P95 latency | > 3 seconds | < 1 second |
| Request queue depth | > 50 pending | < 10 pending |

## Vertical Scaling

### CPU

Increase `SENTINEL_THREAD_POOL_SIZE` to match available cores. Each thread handles one NLI inference. More threads = more concurrent verifications.

| Cores | Thread Pool | Estimated RPM |
|---|---|---|
| 2 | 2 | ~100 |
| 4 | 4 | ~200 |
| 8 | 8 | ~400 |
| 16 | 12 | ~600 |

Diminishing returns above 12 threads due to Python GIL contention on model inference.

### Memory

| Component | Memory |
|---|---|
| NLI model (DeBERTa) | ~800MB |
| Embedding model (MiniLM) | ~100MB |
| spaCy model | ~500MB |
| Application baseline | ~200MB |
| Per-request overhead | ~5MB peak |

Minimum: 2GB. Recommended: 4GB. This allows headroom for request spikes.

### GPU

GPU acceleration provides 10x throughput improvement for NLI inference. Supported GPUs:

- NVIDIA T4 (budget, recommended for most deployments)
- NVIDIA A10G (mid-range)
- NVIDIA A100 (high throughput)

Set `CUDA_VISIBLE_DEVICES=0` and ensure PyTorch CUDA is installed.

## PostgreSQL Scaling

### Connection Pooling

Use PgBouncer or built-in connection pooling:

```
DATABASE_URL=postgresql://sentinel:pass@pgbouncer:6432/sentinel?sslmode=require
```

Recommended pool size: 2x Sentinel instances.

### Read Replicas

For read-heavy workloads (audit log queries, compliance exports), use PostgreSQL read replicas. Sentinel writes only to the primary. Configure read replicas for the dashboard and export APIs.

### Partitioning

The audit log uses TimescaleDB hypertable partitioning by month. This provides:
- Fast inserts (writes go to the current partition only).
- Efficient range queries (only relevant partitions are scanned).
- Easy archival (detach old partitions).

## Redis Scaling

Redis stores ephemeral data only. A single Redis instance handles thousands of Sentinel instances. For high availability:

- Use Redis Sentinel or Redis Cluster.
- Set `maxmemory-policy allkeys-lru` to prevent OOM.
- Recommended memory: 256MB is sufficient for most deployments.

## Load Testing

```bash
# Install k6
brew install k6

# Run load test
k6 run scripts/load_test.js --vus 50 --duration 5m
```

The load test script sends chat completion requests and measures:
- Requests per second.
- P50, P95, P99 latency.
- Error rate.
- Trust Score distribution.

## Capacity Planning

| Daily Requests | Instances (CPU) | Instances (GPU) | PostgreSQL | Redis |
|---|---|---|---|---|
| < 10,000 | 1 | 1 | Single (2 vCPU) | Single |
| 10,000 - 100,000 | 3-5 | 1-2 | Single (4 vCPU) | Single |
| 100,000 - 1,000,000 | 10-20 | 3-5 | Primary + replica | Sentinel |
| > 1,000,000 | 20+ | 10+ | Primary + 2 replicas | Cluster |

## Next Steps

- [Monitoring](monitoring.md) — Track performance metrics for scaling decisions.
- [Deployment Guide](../deployment-guide.md) — Infrastructure setup.
- [Metric Definitions](../reference/metric-definitions.md) — Metrics to watch for scaling.
