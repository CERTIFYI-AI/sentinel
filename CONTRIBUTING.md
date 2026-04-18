# Contributing to Sentinel

## Development Setup

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel/dashboard
npm install
npm run dev
```

## Code Standards

- **TypeScript:** Strict mode. No `any`. Explicit return types on public functions.
- **Components:** Functional components only. Props interfaces defined above component.
- **State:** Zustand for client state. TanStack Query for server state. No mixing.
- **Styling:** CSS custom properties from `tokens.css`. No hardcoded color values. Tailwind utility classes permitted. Radix UI for accessible primitives.
- **Testing:** Vitest for units. Playwright for E2E. Coverage threshold: 70%.

## Pull Request Process

1. Branch from `main` with prefix: `feat/`, `fix/`, `docs/`, `refactor/`
2. One logical change per PR
3. All tests pass: `npm run test && npm run typecheck`
4. Update relevant documentation
5. Add changeset entry: `npx changeset add`

## Commit Format

```
type(scope): short description

Body explaining what and why, not how.
```

Types: `feat` `fix` `docs` `refactor` `test` `chore` `perf`

## Reporting Issues

Open a GitHub issue with:
- Sentinel version
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs

## Security Vulnerabilities

See [SECURITY.md](SECURITY.md). Do not open public issues for security bugs.
