# SDK & Integration Guide

Sentinel provides a Python SDK client (`sentinel.sdk.SentinelClient`) for interacting with a running Sentinel proxy instance. Since Sentinel implements the OpenAI Chat Completions API, any language that can make HTTP requests can integrate.

## Python SDK

### Installation

```bash
pip install -e "."
# Or from source
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel && pip install -e ".[dev]"
```

### Quick Start

```python
import asyncio
from sentinel.sdk import SentinelClient

async def main():
    async with SentinelClient(
        base_url="http://localhost:8000",
        api_key="your-api-key",
        timeout=30,
    ) as client:
        # Health check
        health = await client.health()
        print(f"Status: {health.status}, Version: {health.version}")

        # Chat completion (OpenAI-compatible)
        result = await client.chat(
            messages=[
                {"role": "user", "content": "What is aspirin used for?"}
            ],
            model="gpt-4o",
            temperature=0.7,
        )
        print(result["choices"][0]["message"]["content"])
        print(f"Trust score: {result.get('sentinel_fact_check', {}).get('trust_score')}")

asyncio.run(main())
```

### SentinelClient API

#### Constructor

```python
SentinelClient(
    base_url: str = "http://localhost:8080",
    api_key: Optional[str] = None,
    timeout: int = 30,
)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `base_url` | str | `http://localhost:8080` | Sentinel proxy URL |
| `api_key` | str or None | None | Bearer token for authentication |
| `timeout` | int | 30 | Request timeout in seconds |

#### `chat()`

Send a chat completion request through Sentinel.

```python
async def chat(
    messages: List[Dict[str, str]],
    model: str = "",
    provider: str = "",
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]
```

Returns the full OpenAI-compatible response dict, plus `sentinel_request_id` and (if fact-checking is enabled) `sentinel_fact_check`.

#### `health()`

Check Sentinel system health.

```python
async def health() -> HealthStatus
```

Returns a `HealthStatus` object with `status`, `version`, `uptime_seconds`, and `checks`.

#### `get_stats()`

Get dashboard statistics.

```python
async def get_stats(hours: int = 24) -> Dict[str, Any]
```

#### `get_events()`

Query audit events.

```python
async def get_events(
    request_id: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]
```

#### Context Manager

`SentinelClient` supports `async with` for automatic cleanup:

```python
async with SentinelClient(base_url="http://localhost:8000") as client:
    result = await client.chat(messages=[...])
# Connection automatically closed
```

## REST API Integration (Any Language)

Sentinel is a standard HTTP API. Any language can integrate by pointing OpenAI-compatible requests at Sentinel:

### curl

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### JavaScript / TypeScript

```javascript
const response = await fetch('http://localhost:8000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello' }],
  }),
});
const data = await response.json();
console.log(data.choices[0].message.content);
console.log('Trust score:', data.sentinel_fact_check?.trust_score);
```

### OpenAI Python SDK (Drop-in)

Point the OpenAI SDK at Sentinel by changing `base_url`:

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="your-sentinel-token",
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What is the capital of France?"}],
)
print(response.choices[0].message.content)
```

## WebSocket Integration

Connect to `ws://localhost:8000/ws/metrics` for real-time metrics:

```python
import websockets
import json

async with websockets.connect("ws://localhost:8000/ws/metrics") as ws:
    async for message in ws:
        data = json.loads(message)
        if data["type"] == "metrics":
            print(f"Trust score avg: {data['payload']['avg_trust_score']}")
```

## Related Documentation

- [API Reference](api-reference.md) -- full endpoint documentation
- [Getting Started](../getting-started/installation.md) -- setup and first request
- [Configuration](../getting-started/configuration.md) -- provider and threshold settings
