# Contributing to Sentinel

Thank you for your interest in Sentinel. We welcome pull requests,
issue reports, and documentation improvements from the community.

## Code of Conduct

All participants must follow the
[Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
Report violations privately to `conduct@certifyi.ai`.

## Developer Certificate of Origin (DCO)

All contributions are accepted under the Apache License 2.0. By
submitting a contribution you certify that you have the right to do
so under the [Developer Certificate of Origin v1.1](https://developercertificate.org/).

**Every commit must be signed off.** The sign-off is a single line
added to the end of each commit message:

```
Signed-off-by: Jane Doe <jane@example.com>
```

Use `git commit -s` to add it automatically. CI verifies every
commit in every pull request has a matching `Signed-off-by` line.

## Development Setup

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel/dashboard
npm ci
npm run dev
```

Supabase (local):

```bash
supabase start
supabase db push --include-all
```

## Code Standards

- **TypeScript:** Strict mode (`noUncheckedIndexedAccess`). **No `any`.**
  Explicit return types on public functions.
- **Components:** Functional components only. Props interfaces
  defined above the component. No direct Supabase imports from
  components — always go through a hook or service module.
- **State:** Zustand for client state. TanStack Query for server
  state. Do not mix.
- **Forms:** `react-hook-form` + `zodResolver`. No ad-hoc controlled
  inputs in feature code.
- **Fetching:** Always pass an `AbortSignal` and handle abort on
  unmount. No bare `fetch` without signal.
- **Styling:** CSS custom properties from `tokens.css`. No hardcoded
  colour values. Tailwind utility classes are permitted. Use Radix
  UI for accessible primitives.
- **Accessibility:** Every new page ships explicit
  loading / error / empty states, ARIA landmarks, and full keyboard
  reachability. WCAG 2.2 AA is the floor, not the goal.
- **Testing:** Vitest for units + components. Playwright for E2E.
  Coverage floor: **70%** (lines/branches/functions/statements).
- **Licensing:** Every new source file starts with an Apache-2.0
  licence header.
- **Dates:** UTC in the database. Convert at the view layer.
- **Money:** Integer minor units with ISO 4217 currency code.
- **Secrets:** Never client-side. All third-party calls proxied
  through a Worker or edge function.

### Forbidden

- `any` types, `console.log`, `TODO` comments in shipped code.
- `fetch` without an `AbortSignal`.
- Direct Supabase usage from React components.
- Missing loading / error / empty states.
- Hardcoded user-facing strings (must go through i18n as of WS7).
- Routes without auth guards, tables without RLS, features without
  tests.
- Dependencies without a license + vulnerability check.

## Pull Request Process

1. Branch from `main` using `feat/`, `fix/`, `docs/`, `refactor/`,
   `test/`, `chore/`, or `perf/` prefixes. One workstream = one PR.
2. Sign all commits with DCO (`git commit -s`).
3. Conventional Commits subject line:
   `type(scope): short description`.
4. Ensure all gates pass locally:
   ```bash
   npm run typecheck
   npm run test:coverage
   npm run test:e2e -- --grep @smoke
   ```
5. Update relevant documentation under `docs/**`.
6. Describe **Verification**, **Known carryover**, and **Open items**
   in the PR body.
7. At least one approving review from a CODEOWNER (see
   `.github/CODEOWNERS`).

## Releases

Releases are fully automated via `semantic-release` on merge to
`main`. Conventional Commit types drive the version bump:

| Commit type | Bump |
|---|---|
| `fix:` | patch |
| `feat:` | minor |
| `feat!:` or `BREAKING CHANGE:` | major |

See `docs/release-engineering/ARCHITECTURE.md`.

## Reporting Issues

Open a GitHub issue with:

- Sentinel version or commit SHA.
- Environment (browser, OS, self-hosted vs SaaS).
- Steps to reproduce.
- Expected vs actual behaviour.
- Relevant logs, scrubbed of secrets/PII.

## Security Vulnerabilities

See [SECURITY.md](SECURITY.md). **Do not open public issues for
security bugs.**
