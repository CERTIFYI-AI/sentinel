# Golden Source Setup

The Golden Source is the database of verified facts Sentinel checks LLM responses against. The quality of your Golden Source determines the quality of your fact-checking. Garbage in, garbage out.

## What Belongs in Your Golden Source

**Include**:
- Product documentation and API references
- Policy documents and compliance guidelines
- Clinical guidelines (for healthcare)
- Regulatory text (for finance, legal)
- Internal knowledge base articles
- Verified FAQ content

**Do not include**:
- Marketing copy or sales materials
- Opinion pieces or blog posts
- Unverified user-generated content
- Outdated documentation (remove before ingesting)

## Ingestion Methods

### Markdown Files

```bash
python scripts/seed_golden_source.py --input ./docs/ --format md
```

### PDF Documents

```bash
python scripts/seed_golden_source.py --input ./policies/ --format pdf
```

### Single URL

```bash
python scripts/seed_golden_source.py --url https://your-docs.com/api-reference
```

### JSONL (Structured Facts)

```bash
python scripts/seed_golden_source.py --jsonl ./facts.jsonl
```

JSONL format:

```json
{"doc_id": "api-auth-001", "content": "All API requests require a Bearer token in the Authorization header.", "source_url": "https://docs.example.com/auth"}
{"doc_id": "api-rate-001", "content": "Rate limiting is set to 60 requests per minute per API key.", "source_url": "https://docs.example.com/limits"}
```

### API Endpoint (Programmatic)

```bash
curl -X POST http://localhost:8000/api/golden-source/ingest \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": "product-faq-001",
    "content": "Sentinel supports OpenAI, Anthropic, and any OpenAI-compatible provider.",
    "source_url": "https://docs.certifyi.ai/providers"
  }'
```

## Chunking Strategy

Sentinel splits documents into 512-token chunks with 50-token overlap. This is the default in `GoldenSourceDocument.chunk_size`.

Chunking matters because:
- Chunks too large: retrieval returns irrelevant content mixed with relevant content.
- Chunks too small: claims lose context and NLI scores become unreliable.
- Splitting mid-sentence breaks retrieval quality.

Preview how your documents will be chunked before ingesting:

```bash
python scripts/seed_golden_source.py --input ./docs/ --format md --preview
```

## Keeping the Golden Source Current

Re-ingestion replaces existing chunks by `doc_id`. The same document ingested twice overwrites the previous version.

Recommended: re-ingest on every documentation deployment.

### GitHub Actions Example

```yaml
name: Update Golden Source
on:
  push:
    branches: [main]
    paths: ['docs/**']

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          python scripts/seed_golden_source.py \
            --input ./docs/ --format md \
            --api-url ${{ secrets.SENTINEL_URL }} \
            --api-key ${{ secrets.SENTINEL_API_KEY }}
```

## Testing Retrieval Quality

Search your Golden Source to see what Sentinel would retrieve for a given query:

```bash
curl "http://localhost:8000/api/golden-source/search?q=how+is+trust+score+calculated" \
  -H "Authorization: Bearer $API_KEY"
```

The response shows matched chunks with similarity scores. A similarity score above 0.72 (the default `golden_source_similarity_threshold`) means the chunk will be used as evidence for NLI scoring.

### Signs Your Golden Source Needs Work

- **Trust Scores are always 0.5**: Your Golden Source is empty or too sparse. Sentinel defaults to 0.5 when it has no evidence.
- **High-confidence wrong verdicts**: Your Golden Source contains outdated or incorrect information. Audit your sources.
- **Low similarity scores on relevant queries**: Your documents are too long. Try smaller chunk sizes.
- **Irrelevant chunks returned**: Your Golden Source contains marketing copy or opinion. Remove non-factual content.

## Next Steps

- [Configuration](../getting-started/configuration.md) — Tune `golden_source_similarity_threshold` and `chunk_size`.
- [Trust Score Reference](../reference/trust-score.md) — Understand how Golden Source quality affects scoring.
- [How It Works](../architecture/how-it-works.md) — See where Golden Source fits in the pipeline.
