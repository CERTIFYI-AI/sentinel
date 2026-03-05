# Contributing to Certifyi Sentinel

Thank you for your interest in contributing to Sentinel. This document covers the process for submitting changes.

## Development Setup

1. Fork and clone the repository
2. Copy `.env.example` to `.env` and fill in your API keys
3. Start services: `docker compose up -d postgres redis`
4. Install dependencies: `pip install -e '.[dev]'`
5. Download spaCy model: `python -m spacy download en_core_web_lg`
6. Run tests: `pytest`

## Pull Request Process

Open a PR against `main`. Every PR must pass CI (pytest + ruff + mypy) and include tests for new functionality. A maintainer will review within 48 hours.

## Code Standards

- Type hints on all function signatures
- No placeholder code (`pass`, `TODO`, `NotImplementedError`)
- Constants in `sentinel/config.py` with documented derivations
- Error messages that tell the user what to fix
- Tests with realistic fixtures, not trivial mocks

## Reporting Issues

Use GitHub Issues. Include: expected behavior, actual behavior, reproduction steps, and your environment (Python version, OS).

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.