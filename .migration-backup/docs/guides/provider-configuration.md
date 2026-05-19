# Provider Configuration

Sentinel supports multiple LLM providers through a unified abstraction layer. This guide covers configuration for each supported provider.

## Supported Providers

| Provider | Models | Status |
|----------|--------|--------|
| OpenAI | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo | Stable |
| Anthropic | claude-3-5-sonnet, claude-3-haiku | Stable |
| Azure OpenAI | All Azure-deployed models | Stable |
| Ollama | Any locally served model | Beta |

## OpenAI

```bash
# .env
OPENAI_API_KEY=sk-...
SENTINEL_DEFAULT_PROVIDER=openai
SENTINEL_DEFAULT_MODEL=gpt-4o
```

```yaml
# configs/sentinel.yaml
provider:
  name: openai
  model: gpt-4o
  timeout_seconds: 30
  max_retries: 3
```

## Anthropic

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
SENTINEL_DEFAULT_PROVIDER=anthropic
SENTINEL_DEFAULT_MODEL=claude-3-5-sonnet-20241022
```

```yaml
# configs/sentinel.yaml
provider:
  name: anthropic
  model: claude-3-5-sonnet-20241022
  timeout_seconds: 30
  max_retries: 3
```

## Azure OpenAI

```bash
# .env
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-01
SENTINEL_DEFAULT_PROVIDER=azure
SENTINEL_DEFAULT_MODEL=gpt-4o  # Your deployment name
```

```yaml
# configs/sentinel.yaml
provider:
  name: azure
  model: gpt-4o
  azure_deployment: gpt-4o-deployment
  timeout_seconds: 30
```

## Ollama (Local Models)

```bash
# Start Ollama first
ollama pull llama3.2
ollama serve

# .env
OLLAMA_BASE_URL=http://localhost:11434
SENTINEL_DEFAULT_PROVIDER=ollama
SENTINEL_DEFAULT_MODEL=llama3.2
```

```yaml
# configs/sentinel.yaml
provider:
  name: ollama
  model: llama3.2
  base_url: http://localhost:11434
  timeout_seconds: 60  # Local models are slower
```

> Note: Ollama providers have no PII data-in-transit risk since all processing is local. Trust score thresholds may need adjustment as open-source model performance differs from GPT-4o.

## Circuit Breaker Provider Override

For L2 regeneration, you can configure a different (stronger) model:

```yaml
circuit_breaker:
  upgrade_model: gpt-4o        # Used for L2 regeneration regardless of default provider
  upgrade_provider: openai     # Explicitly set provider for upgrade model
```

## Cross-Check Provider

For L1 cross-checks, use a fast/cheap model to keep costs down:

```yaml
circuit_breaker:
  cross_check:
    model: gpt-4o-mini
    provider: openai
    n_checks: 3
```

## Verifier Embedding Model

The verifier uses embeddings for RAG retrieval. Configure the embedding model separately:

```yaml
verifier:
  embedding_model: text-embedding-3-small
  embedding_provider: openai
  embedding_dimensions: 1536
```

## Related Documents

- [Configuration Reference](../configuration.md)
- [Environment Variables](../reference/environment-variables.md)
- [Architecture](../architecture.md)
