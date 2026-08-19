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
    print(f"Database seeded. API key prefix: {raw_key[:8]}...")

if __name__ == "__main__":
    asyncio.run(main())
