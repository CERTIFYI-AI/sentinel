# Data Seeding in Sentinel AI GRC

This document explains how initial seed data is populated into the Sentinel AI GRC platform's database.

## Overview

Unlike many projects that use external scripts or one-off data dumps, Sentinel leverages **Supabase Migrations** to guarantee consistency between environments, testing, and initial deployments.

Our seed data is packaged directly inside the migration chain. Specifically, our final migration files (e.g. `20260421000020_ws09_seed.sql` and `20260417000002_seed_frameworks.sql` in `supabase/migrations/`) insert a comprehensive set of canonical baseline data.

## What's Included in the Seed?

When a fresh instance of the database is created, the seed data provisions **Sentinel Financial Corp**, our canonical demo organisation. This includes:

1. **Users & Roles**: 6 pre-configured users demonstrating each RBAC role (Admin, Chief Risk Officer, Compliance Officer, AI Engineer, Auditor, Data Scientist).
2. **AI Models**: 6 simulated AI models across various risk tiers (e.g., Low, Medium, High, Critical).
3. **Governance Agents**: 10 active autonomous governance agents.
4. **Frameworks & Policies**: Baseline configuration for EU AI Act, NIST AI RMF, and ISO/IEC 42001.
5. **Synthetic Events**: 30 days of simulated governance events to ensure the dashboards and metrics look realistic out-of-the-box.

## How to Apply the Seed Data

Because the seed is bundled into the Supabase migrations, you do not need to run any separate Python scripts or manual SQL inserts. 

### Local Environment

To spin up a local instance of the database with all schemas and seed data applied automatically, simply run:

```bash
supabase start
```

If your database is already running and you wish to wipe the database and re-apply all migrations (and the seed data), run:

```bash
supabase db reset
```

### Production Environment

In a production environment, applying migrations will safely execute the inserts. All `INSERT` statements in our seed migrations are designed to use `ON CONFLICT DO NOTHING` or `UPSERT` to ensure they can be re-run safely without causing duplicate key errors.

## Legacy Scripts

Historically, we utilized several Python and SQL scripts (`seed_mitre.py`, `gen_seed.py`, `seed_data.sql`, etc.) to procedurally generate this seed data from external APIs and templates. These scripts have since been removed from the repository to reduce clutter and standardize the build pipeline. If you need to generate new massive datasets, we recommend using Supabase's native Data Studio or creating a custom database migration script.
