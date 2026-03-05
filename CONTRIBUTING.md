# Contributing to Certifyi Sentinel

Sentinel is Apache 2.0 licensed. Every contribution goes through the same review process regardless of who wrote it.

---

## For First-Time Contributors

The fastest path to a merged PR:

1. Pick an issue labelled [`good first issue`](https://github.com/CERTIFYI-AI/sentinel/labels/good%20first%20issue)
2. Set up the dev environment (under 10 minutes — see below)
3. Make the change. First PRs should be under 20 lines changed.
4. Run the test suite
5. Open the PR against `main`

### Development Environment (exact commands)

```bash
# Clone
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel

# Python environment
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Download spaCy NLP model (required for PII detection)
python -m spacy download en_core_web_lg

# Start infrastructure (PostgreSQL + Redis)
docker compose -f docker/docker-compose.dev.yml up -d

# Copy environment config
cp .env.example .env
# Edit .env — set DATABASE_URL, REDIS_URL, and SECRET_KEY

# Verify everything works
pytest tests/ -v
ruff check .
mypy sentinel/
```

If `pytest` passes and `ruff check` returns no errors, you are ready.

---

## For Regular Contributors

### Architecture Conventions

- **Layers are stateless.** Sanitizer, Verifier, and Circuit Breaker process a request and return a result. They do not hold state between requests.
- **Storage is async.** All database and Redis operations use `asyncpg`, `aioredis`, or equivalent async clients.
- **Configuration lives in `sentinel/config.py`.** If you add a new configurable setting, add it there using Pydantic Settings with a default value.
- **Models live in `sentinel/models.py`.** Every data structure that crosses a module boundary is a Pydantic model.

### How to Add a New Provider

1. Create `sentinel/providers/your_provider.py`
2. Implement the `BaseProvider` interface:

```python
from sentinel.providers.base import BaseProvider, ProviderResponse

class YourProvider(BaseProvider):
    name = "your-provider"

    async def complete(
        self, messages: list[dict], model: str, **kwargs
    ) -> ProviderResponse:
        # Call your provider's API
        # Return ProviderResponse(content=..., model=..., usage=...)
        ...
```

3. Register it in `sentinel/providers/__init__.py`
4. Add a test in `tests/test_providers/test_your_provider.py`
5. Add configuration in `docs/guides/provider-configuration.md`

### How to Add a New Pipeline Layer

1. Create `sentinel/layers/your_layer.py`
2. Implement the `BaseLayer` interface:

```python
from sentinel.layers.base import BaseLayer, LayerResult

class YourLayer(BaseLayer):
    name = "your-layer"

    async def process(self, request, response, context) -> LayerResult:
        # Process and return LayerResult
        ...
```

3. Register it in the pipeline ordering in `sentinel/proxy.py`
4. Add tests in `tests/test_layers/test_your_layer.py`

### How to Write Tests That Pass Review

- Use realistic fixtures, not trivial mocks. If you need an LLM response, use `tests/fixtures/` for pre-recorded responses.
- Test the public interface of each function. Test inputs, outputs, and side effects.
- Test error paths. If a function raises, write a test that triggers the raise.
- Use `pytest.mark.asyncio` for async tests.
- Name tests with the pattern `test_{function_name}_{scenario}_{expected_result}`.

### PR Checklist

Before opening a PR, verify:

- [ ] `pytest tests/ -v` passes (all tests green)
- [ ] `ruff check .` returns no errors
- [ ] `mypy sentinel/` returns no errors
- [ ] All new functions have type hints on every parameter and return value
- [ ] All new public functions have docstrings (NumPy-style)
- [ ] New features include tests
- [ ] Documentation is updated (API changes, config changes, new features)
- [ ] CHANGELOG.md has an entry under `[Unreleased]`
- [ ] Commit messages follow conventional commit format (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`)

---

## For Significant Contributions

### RFC Process

Architectural changes require an RFC (Request for Comments) before implementation:

1. Open a GitHub Discussion in the "RFCs" category
2. Use this format:
   - **Problem**: What problem does this solve?
   - **Proposal**: What is the proposed change?
   - **Alternatives**: What alternatives did you consider?
   - **Impact**: What existing code, configs, or APIs change?
3. Wait for maintainer feedback (7 days minimum discussion period)
4. If approved, a maintainer labels the discussion `rfc-accepted`
5. Implement and open a PR referencing the RFC

RFCs are required for:
- New pipeline layers
- Changes to the Trust Score formula
- New storage backends
- Breaking API changes
- New compliance framework mappings

### Contributing to the Eval Dataset

The eval dataset in `data/eval_dataset.jsonl` drives the benchmarks reported in the README. To contribute:

1. Add entries in the format: `{"prompt": "...", "expected_claims": [...], "is_hallucination": bool}`
2. Each entry must cite its golden source document
3. Run `python scripts/run_eval.py --validate` to verify the entry format
4. Include a description of the domain and why the claim is factual or hallucinated

### Decision Making

Decisions are made by the maintainer team. For disputed decisions, maintainers vote. The project lead (Certifyi CTO) has tie-breaking authority.

Maintainers: listed in [MAINTAINERS.md](MAINTAINERS.md) (when the team grows beyond the founding contributors).

## Code Standards

- Type hints on all function signatures
- No placeholder code (`pass`, `TODO`, `NotImplementedError`)
- Constants in `sentinel/config.py` with documented derivations
- Error messages tell the user what to fix
- Tests with realistic fixtures, not trivial mocks

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
