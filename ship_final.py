#!/usr/bin/env python3
"""Sentinel Final Ship Sprint - generates all missing/broken files."""
import pathlib, textwrap

def w(p, c):
    f = pathlib.Path(p)
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(textwrap.dedent(c).lstrip())
    print(f'  wrote {p}')

    print('=== PHASE 2: Generating files ===')

    # ── 1. docker-compose.yml ──
w('docker-compose.yml', '''
    version: "3.8"
    services:
      sentinel:
        build: .
        ports:
          - "${SENTINEL_PORT:-8000}:8000"
        env_file: .env
        depends_on:
          postgres:
            condition: service_healthy
          redis:
            condition: service_healthy
        healthcheck:
          test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
          interval: 10s
          timeout: 5s
          retries: 5
        volumes:
          - ./dashboard/dist:/app/static
        restart: unless-stopped

      postgres:
        image: timescale/timescaledb-ha:pg16-latest
        environment:
          POSTGRES_USER: sentinel
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-sentinel}
          POSTGRES_DB: sentinel
        ports:
          - "5432:5432"
        volumes:
          - pgdata:/home/postgres/pgdata/data
          - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U sentinel"]
          interval: 5s
          timeout: 3s
          retries: 5
        restart: unless-stopped

      redis:
        image: redis:7-alpine
        command: redis-server --requirepass ${REDIS_PASSWORD:-sentinel}
        ports:
          - "6379:6379"
        healthcheck:
          test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-sentinel}", "ping"]
          interval: 5s
          timeout: 3s
          retries: 5
        volumes:
          - redisdata:/data
        restart: unless-stopped

      celery:
        build: .
        command: celery -A sentinel.compliance.engine worker -l info
        env_file: .env
        depends_on:
          postgres:
            condition: service_healthy
          redis:
            condition: service_healthy
        restart: unless-stopped

      grafana:
        image: grafana/grafana:latest
        ports:
          - "3000:3000"
        environment:
          GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
        volumes:
          - grafanadata:/var/lib/grafana
        restart: unless-stopped

      prometheus:
        image: prom/prometheus:latest
        ports:
          - "9090:9090"
        volumes:
          - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
        restart: unless-stopped

    volumes:
      pgdata:
      redisdata:
      grafanadata:
''')

# ── 2. Dockerfile (multi-stage) ──
w('Dockerfile', '''
    FROM python:3.11-slim AS builder
    WORKDIR /build
    RUN apt-get update && apt-get install -y --no-install-recommends \\
        gcc g++ build-essential libpq-dev curl && \\
        rm -rf /var/lib/apt/lists/*
    COPY pyproject.toml poetry.lock* ./
    RUN pip install --no-cache-dir poetry && \\
        poetry config virtualenvs.create false && \\
        poetry install --no-dev --no-interaction
    RUN python -m spacy download en_core_web_lg
    RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
    RUN python -c "from transformers import AutoModelForSequenceClassification, AutoTokenizer; AutoModelForSequenceClassification.from_pretrained('cross-encoder/nli-deberta-v3-large'); AutoTokenizer.from_pretrained('cross-encoder/nli-deberta-v3-large')"

    FROM python:3.11-slim
    WORKDIR /app
    RUN apt-get update && apt-get install -y --no-install-recommends \\
        libpq5 curl && rm -rf /var/lib/apt/lists/*
    COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
    COPY --from=builder /usr/local/bin /usr/local/bin
    COPY --from=builder /root/.cache /root/.cache
    COPY sentinel/ ./sentinel/
    COPY scripts/ ./scripts/
    COPY dashboard/dist/ ./static/
    EXPOSE 8000
    HEALTHCHECK --interval=10s --timeout=5s --retries=3 \\
        CMD curl -f http://localhost:8000/health || exit 1
    CMD ["uvicorn", "sentinel.proxy:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--loop", "uvloop"]
''')

# ── 3. docker/postgres/init.sql ──
w('docker/postgres/init.sql', '''
    -- Sentinel Database Initialization
    CREATE EXTENSION IF NOT EXISTS timescaledb;
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS tenants (
        tenant_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free',
        config JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
        key_hash TEXT NOT NULL,
        prefix TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        scopes TEXT[] NOT NULL DEFAULT ARRAY['proxy'],
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_log (
        id BIGSERIAL,
        tenant_id TEXT NOT NULL,
        request_id TEXT NOT NULL,
        ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        model TEXT,
        prompt_hash TEXT,
        response_hash TEXT,
        trust_score DOUBLE PRECISION,
        intervention TEXT,
        pii_detected TEXT[],
        latency_ms INTEGER,
        metadata JSONB NOT NULL DEFAULT '{}',
        prev_hash TEXT,
        entry_hash TEXT NOT NULL,
        PRIMARY KEY (id, ts)
    );
    SELECT create_hypertable('audit_log', 'ts', if_not_exists => TRUE);

    CREATE TABLE IF NOT EXISTS golden_source (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding vector(384),
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS golden_source_embedding_idx
        ON golden_source USING hnsw (embedding vector_cosine_ops);

    CREATE TABLE IF NOT EXISTS compliance_evidence (
        id BIGSERIAL,
        tenant_id TEXT NOT NULL,
        ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        framework TEXT NOT NULL,
        control_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'not_assessed',
        evidence JSONB NOT NULL DEFAULT '{}',
        PRIMARY KEY (id, ts)
    );
    SELECT create_hypertable('compliance_evidence', 'ts', if_not_exists => TRUE);

    CREATE TABLE IF NOT EXISTS centroids (
        tenant_id TEXT PRIMARY KEY,
        centroid vector(384),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Default tenant
    INSERT INTO tenants (tenant_id, name, plan)
    VALUES ('default', 'Default Tenant', 'enterprise')
    ON CONFLICT (tenant_id) DO NOTHING;
''')

# ── 4. sentinel/api/auth_router.py ──
w('sentinel/api/auth_router.py', '''
    # sentinel/api/auth_router.py
    from __future__ import annotations
    import hashlib, secrets, logging
    from datetime import datetime, timedelta, timezone
    from typing import Optional
    import jwt
    from fastapi import APIRouter, HTTPException, Depends
    from pydantic import BaseModel, EmailStr
    from sentinel.config import get_settings

    logger = logging.getLogger(__name__)
    router = APIRouter(prefix="/api/auth", tags=["auth"])

    class TokenRequest(BaseModel):
        api_key: str

    class TokenResponse(BaseModel):
        access_token: str
        token_type: str = "bearer"
        expires_in: int = 3600

    class RegisterRequest(BaseModel):
        email: EmailStr
        org_name: str
        plan: str = "free"

    def _create_jwt(tenant_id: str, scopes: list[str]) -> str:
        settings = get_settings()
        now = datetime.now(timezone.utc)
        payload = {
            "sub": tenant_id,
            "scopes": scopes,
            "iat": now,
            "exp": now + timedelta(hours=1),
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    @router.post("/token", response_model=TokenResponse)
    async def get_token(body: TokenRequest) -> TokenResponse:
        settings = get_settings()
        key_hash = hashlib.sha256(body.api_key.encode()).hexdigest()
        pool = settings.db_pool
        if pool is None:
            raise HTTPException(503, "Database unavailable")
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT tenant_id, scopes FROM api_keys WHERE key_hash = $1 AND revoked = FALSE",
                key_hash,
            )
        if not row:
            raise HTTPException(401, "Invalid API key")
        token = _create_jwt(row["tenant_id"], row["scopes"])
        return TokenResponse(access_token=token)

    @router.post("/register")
    async def register(body: RegisterRequest) -> dict[str, str]:
        settings = get_settings()
        pool = settings.db_pool
        if pool is None:
            raise HTTPException(503, "Database unavailable")
        tenant_id = f"tenant-{secrets.token_hex(8)}"
        raw_key = f"sk-sentinel-{secrets.token_hex(20)}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        prefix = raw_key[:16]
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO tenants (tenant_id, name, plan) VALUES ($1, $2, $3)",
                tenant_id, body.org_name, body.plan,
            )
            await conn.execute(
                "INSERT INTO api_keys (id, tenant_id, key_hash, prefix, name, scopes) VALUES ($1, $2, $3, $4, $5, $6)",
                secrets.token_hex(16), tenant_id, key_hash, prefix, "default", ["proxy", "dashboard"],
            )
        logger.info("Registered tenant %s for %s", tenant_id, body.email)
        return {"tenant_id": tenant_id, "api_key": raw_key, "message": "Store this key securely. It will not be shown again."}
''')

# ── 5. dashboard/nginx.conf ──
w('dashboard/nginx.conf', '''
    server {
        listen 80;
        root /usr/share/nginx/html;
        index index.html;

        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml;

        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }

        location /api/ {
            proxy_pass http://sentinel:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /dashboard/ {
            proxy_pass http://sentinel:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /ws/ {
            proxy_pass http://sentinel:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }

        location /health {
            proxy_pass http://sentinel:8000;
        }

        location /v1/ {
            proxy_pass http://sentinel:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location / {
            try_files $uri $uri/ /index.html;
            add_header Cache-Control "no-cache";
        }
    }
''')

# ── 6. dashboard/Dockerfile ──
w('dashboard/Dockerfile', '''
    FROM node:20-alpine AS builder
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci --frozen-lockfile
    COPY . .
    RUN npm run build

    FROM nginx:alpine
    COPY --from=builder /app/dist /usr/share/nginx/html
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    EXPOSE 80
''')

# ── 7. .env.example ──
w('.env.example', '''
    # Required
    DATABASE_URL=postgresql://sentinel:sentinel@postgres:5432/sentinel
    REDIS_URL=redis://:sentinel@redis:6379/0
    SECRET_KEY=  # min 32 chars, generate: openssl rand -hex 32
    OPENAI_API_KEY=  # sk-...

    # Optional - defaults shown
    ANTHROPIC_API_KEY=
    TRUST_SCORE_BLOCK_THRESHOLD=0.85
    INJECTION_BLOCK_THRESHOLD=0.78
    FALLBACK_MODEL=gpt-4o
    CB_OPEN_THRESHOLD=5
    CB_WINDOW_SECONDS=60
    RATE_LIMIT_PER_MINUTE=1000
    CORS_ORIGINS=*
    SENTINEL_PORT=8000
    GRAFANA_PASSWORD=admin
    REDIS_PASSWORD=sentinel
    POSTGRES_PASSWORD=sentinel

    # Frontend
    VITE_API_URL=
''')

# ── 8. dashboard/src/lib/api-client.ts ──
w('dashboard/src/lib/api-client.ts', '''
    // dashboard/src/lib/api-client.ts
    const BASE = import.meta.env.VITE_API_URL || "";

    function getToken(): string | null {
      return localStorage.getItem("sentinel-token");
    }

    export async function api<T>(path: string, init?: RequestInit): Promise<T> {
      const token = getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> || {}),
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BASE}${path}`, { ...init, headers });
      if (res.status === 401) {
        localStorage.removeItem("sentinel-token");
        window.location.href = "/login";
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      return res.json();
    }

    export class SentinelWebSocket {
      private ws: WebSocket | null = null;
      private retries = 0;
      private maxRetries = 10;
      private listeners: ((data: unknown) => void)[] = [];

      constructor(private path: string) {}

      connect(): void {
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = BASE ? new URL(BASE).host : window.location.host;
        const token = getToken();
        const url = `${proto}//${host}${this.path}${token ? `?token=${token}` : ""}`;
        this.ws = new WebSocket(url);
        this.ws.onmessage = (e) => {
          const data = JSON.parse(e.data) as unknown;
          this.listeners.forEach((fn) => fn(data));
        };
        this.ws.onclose = () => {
          if (this.retries < this.maxRetries) {
            const delay = Math.min(1000 * 2 ** this.retries, 30000);
            this.retries++;
            setTimeout(() => this.connect(), delay);
          }
        };
        this.ws.onopen = () => { this.retries = 0; };
      }

      onMessage(fn: (data: unknown) => void): void {
        this.listeners.push(fn);
      }

      close(): void {
        this.maxRetries = 0;
        this.ws?.close();
      }
    }
''')

# ── 9. docker/prometheus/prometheus.yml ──
w('docker/prometheus/prometheus.yml', '''
    global:
      scrape_interval: 15s
    scrape_configs:
      - job_name: sentinel
        static_configs:
          - targets: ["sentinel:8000"]
        metrics_path: /metrics
''')

# ── 10. scripts/seed_db.py ──
w('scripts/seed_db.py', '''
    #!/usr/bin/env python3
    """Seed the Sentinel database with demo data."""
    import asyncio, hashlib, secrets, os, sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    import asyncpg

    GOLDEN_DOCS = [
        ("ISO 42001 Overview", "ISO/IEC 42001 specifies requirements for establishing an AI management system (AIMS). It provides a framework for responsible AI development and deployment."),
        ("EU AI Act - Article 6", "High-risk AI systems are subject to conformity assessment requirements before being placed on the EU market."),
        ("NIST AI RMF Govern", "The Govern function establishes AI risk management culture and processes within an organization."),
        ("NIST AI RMF Map", "The Map function categorizes AI systems and identifies associated risks and impacts."),
        ("NIST AI RMF Measure", "The Measure function quantifies AI risks using metrics, testing, and monitoring approaches."),
        ("NIST AI RMF Manage", "The Manage function prioritizes and acts on AI risks through mitigation strategies."),
        ("GDPR Article 22", "Data subjects have the right not to be subject to automated decision-making including profiling which produces legal effects."),
        ("EU AI Act Transparency", "Providers of AI systems interacting with persons must ensure humans are informed they are interacting with AI."),
        ("ISO 42001 Annex A Controls", "Annex A defines controls for AI risk treatment including data governance, model validation, and monitoring."),
        ("Hallucination: Medical", "LLMs can generate plausible but incorrect medical information, such as fabricating drug interactions or dosages."),
        ("Hallucination: Legal", "LLMs may cite non-existent case law or statutes, creating significant liability in legal contexts."),
        ("EU AI Act Risk Levels", "The EU AI Act classifies AI systems into four risk categories: unacceptable, high, limited, and minimal."),
        ("AI Bias Mitigation", "Systematic bias in training data can lead to discriminatory AI outputs requiring active detection and mitigation."),
        ("Model Cards Best Practice", "Model cards document intended use, performance metrics, and limitations of ML models."),
        ("Prompt Injection Defense", "Prompt injection attacks attempt to override system instructions through crafted user inputs."),
        ("RAG Grounding", "Retrieval-Augmented Generation grounds LLM responses in factual source documents to reduce hallucination."),
        ("AI Incident Response", "Organizations should have incident response plans specifically for AI system failures and unexpected behaviors."),
        ("Data Lineage for AI", "Tracking data provenance from collection to model training ensures reproducibility and compliance."),
        ("Continuous Monitoring", "AI systems require ongoing monitoring for performance degradation, drift, and emerging risks."),
        ("Human Oversight", "High-risk AI decisions should include meaningful human oversight with the ability to override."),
    ]

    async def main():
        db_url = os.environ.get("DATABASE_URL", "postgresql://sentinel:sentinel@localhost:5432/sentinel")
        pool = await asyncpg.create_pool(db_url)
        assert pool is not None

        async with pool.acquire() as conn:
            # Check if already seeded
            count = await conn.fetchval("SELECT COUNT(*) FROM tenants WHERE tenant_id = $1", "certifyi-demo")
            if count and count > 0:
                print("Database already seeded. Skipping.")
                key_row = await conn.fetchrow("SELECT prefix FROM api_keys WHERE tenant_id = $1", "certifyi-demo")
                if key_row:
                    print(f"Existing key prefix: {key_row[0]}...")
                await pool.close()
                return

            # Create demo tenant
            await conn.execute(
                "INSERT INTO tenants (tenant_id, name, plan) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
                "certifyi-demo", "Certifyi Demo", "enterprise"
            )

            # Create API key
            raw_key = f"sk-sentinel-{secrets.token_hex(20)}"
            key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
            await conn.execute(
                "INSERT INTO api_keys (id, tenant_id, key_hash, prefix, name, scopes) VALUES ($1, $2, $3, $4, $5, $6)",
                secrets.token_hex(16), "certifyi-demo", key_hash, raw_key[:16], "demo-key",
                ["proxy", "dashboard"]
            )

            # Seed golden source docs
            try:
                from sentence_transformers import SentenceTransformer
                model = SentenceTransformer("all-MiniLM-L6-v2")
                for title, content in GOLDEN_DOCS:
                    emb = model.encode(content).tolist()
                    await conn.execute(
                        "INSERT INTO golden_source (tenant_id, title, content, embedding) VALUES ($1, $2, $3, $4)",
                        "certifyi-demo", title, content, str(emb)
                    )
                # Create baseline centroid
                all_embs = model.encode([c for _, c in GOLDEN_DOCS])
                centroid = all_embs.mean(axis=0).tolist()
                await conn.execute(
                    "INSERT INTO centroids (tenant_id, centroid) VALUES ($1, $2) ON CONFLICT (tenant_id) DO UPDATE SET centroid = $2",
                    "certifyi-demo", str(centroid)
                )
                print(f"Seeded {len(GOLDEN_DOCS)} golden source documents with embeddings.")
            except ImportError:
                for title, content in GOLDEN_DOCS:
                    await conn.execute(
                        "INSERT INTO golden_source (tenant_id, title, content) VALUES ($1, $2, $3)",
                        "certifyi-demo", title, content
                    )
                print(f"Seeded {len(GOLDEN_DOCS)} golden source documents (no embeddings - sentence-transformers not installed).")

        await pool.close()
        print(f"Database seeded. API key: {raw_key}")

    if __name__ == "__main__":
        asyncio.run(main())
''')

# ── 11. scripts/create_first_admin.py ──
w('scripts/create_first_admin.py', '''
    #!/usr/bin/env python3
    """Create the first admin tenant and API key."""
    import argparse, asyncio, hashlib, secrets, os, sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    import asyncpg

    async def main():
        parser = argparse.ArgumentParser(description="Create first admin")
        parser.add_argument("--email", required=True)
        parser.add_argument("--org-name", required=True)
        args = parser.parse_args()

        db_url = os.environ.get("DATABASE_URL", "postgresql://sentinel:sentinel@localhost:5432/sentinel")
        pool = await asyncpg.create_pool(db_url)
        assert pool is not None

        tenant_id = f"tenant-{secrets.token_hex(8)}"
        raw_key = f"sk-sentinel-{secrets.token_hex(20)}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO tenants (tenant_id, name, plan, config) VALUES ($1, $2, $3, $4)",
                tenant_id, args.org_name, "enterprise",
                f'{{"admin_email": "{args.email}"}}',
            )
            await conn.execute(
                "INSERT INTO api_keys (id, tenant_id, key_hash, prefix, name, scopes) VALUES ($1, $2, $3, $4, $5, $6)",
                secrets.token_hex(16), tenant_id, key_hash, raw_key[:16], "admin",
                ["proxy", "dashboard", "admin"],
            )

        await pool.close()
        print(f"Admin created for {args.org_name}")
        print(f"Tenant ID: {tenant_id}")
        print(f"API Key:   {raw_key}")
        print("Store this key securely. It will not be shown again.")

    if __name__ == "__main__":
        asyncio.run(main())
''')

# ── 12. scripts/__init__.py ──
w('scripts/__init__.py', '')

print('\n=== All files generated ===')