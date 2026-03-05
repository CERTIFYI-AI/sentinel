# Getting Support

## Where to Find Help

Use this list in order. Start at the top.

### 1. Documentation

Search the [docs/](docs/) directory first. The answer to most questions is in one of these:

- [Quickstart](docs/guides/quickstart.md) — first run, end to end
- [Configuration](docs/configuration.md) — every config option explained
- [Troubleshooting](docs/ops/troubleshooting.md) — the 20 most common issues
- [API Reference](docs/api-reference.md) — every endpoint, header, and error code
- [Error Codes](docs/reference/error-codes.md) — what each error means and how to fix it

### 2. GitHub Discussions

Use [GitHub Discussions](https://github.com/CERTIFYI-AI/sentinel/discussions) for:

- Questions about configuration or usage
- Ideas for new features
- Show and tell — share how you are using Sentinel
- General architectural questions

### 3. GitHub Issues

Use [GitHub Issues](https://github.com/CERTIFYI-AI/sentinel/issues) for **confirmed bugs only**. A confirmed bug means:

- You have a specific reproduction case
- You have checked the troubleshooting guide and it does not solve the problem
- You can describe expected behaviour vs. actual behaviour

### 4. Enterprise Support

For organisations deploying Sentinel in production and needing SLA-backed support, compliance guidance, or custom integrations:

**[certifyi.ai/contact](https://certifyi.ai/contact)**

Certifyi provides ISO 42001 and SOC 2 compliance programmes that include Sentinel deployment, tuning, and ongoing monitoring.

## What NOT to Put in a GitHub Issue

- **"How do I...?" questions** → Use Discussions, not Issues
- **Feature requests without context** → Open a Discussion with a use case description
- **Vague reports** → "It doesn't work" is not actionable. Include: version, config, error message, and reproduction steps
- **Security vulnerabilities** → Use [GitHub's private vulnerability reporting](https://github.com/CERTIFYI-AI/sentinel/security/advisories/new). See [SECURITY.md](SECURITY.md)
- **Questions about compliance certifications** → Sentinel provides technical controls, not certification advice. Contact [certifyi.ai](https://certifyi.ai) for certification programmes

## Bug Report Template

When opening an issue, include:

```
**Sentinel version**: (output of `python -c "import sentinel; print(sentinel.__version__)"`) 
**Python version**: (output of `python --version`)
**OS**: (e.g., Ubuntu 22.04, macOS 14.2)
**Running via**: (Docker Compose / bare metal / Kubernetes)

**Expected behaviour**: What should happen
**Actual behaviour**: What happens instead
**Reproduction steps**:
1. Step one
2. Step two
3. Step three

**Relevant config** (redact secrets):
```yaml
# paste relevant sentinel.yaml sections
```

**Error output**:
```
# paste the full error traceback or log output
```
```

The more specific your report, the faster we can help.
