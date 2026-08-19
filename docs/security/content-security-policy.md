# Content-Security-Policy

Sentinel serves the dashboard from three deployment fronts, each of which sets
HTTP response headers in its own syntax:

| Front | File | Used for |
| --- | --- | --- |
| Cloudflare Pages | `dashboard/public/_headers` | the hosted dashboard |
| Cloudflare Workers | `dashboard/wrangler.toml` (`[headers.values]`) | the worker-served build |
| nginx (container) | `dashboard/nginx.conf` (`add_header`, ×3 blocks) | the Docker image |

Because a weak CSP on any one front is a weak CSP for whoever is routed there,
**the policy string must stay byte-identical across all three.** This document
is the source of truth for that string; change it here first, then propagate.

## Canonical policy

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests
```

(Written on one line in each file; wrapped here for readability.)

## Directive rationale

- **`script-src 'self' 'wasm-unsafe-eval'`** — no `'unsafe-inline'`, so an
  injected `<script>` or inline handler will not execute: this is CSP's core
  XSS defence and it is not negotiable. `'wasm-unsafe-eval'` permits *only*
  `WebAssembly.compile/instantiate`; it does **not** re-enable JavaScript
  `eval`, so it does not weaken the script defence. It is present so a
  dependency that ships a WASM module does not break under CSP.
- **`style-src 'self' 'unsafe-inline'`** — this is the one `'unsafe-inline'`
  we keep, and only for **styles**. The dashboard is built on React inline
  `style={{…}}` props (thousands of them); a nonce/hash style policy cannot
  cover attribute-level inline styles, so removing it would break the entire
  UI. Style injection cannot run script and is a materially lower risk than
  script injection — this is an accepted, documented residual, tracked in the
  technical-debt register, not an oversight.
- **`connect-src`** — the Supabase REST/Realtime origins (HTTPS + WSS) and the
  Sentry ingest origin. Nothing else may be fetched or opened as a socket.
- **`object-src 'none'`**, **`base-uri 'self'`**, **`form-action 'self'`**,
  **`frame-ancestors 'none'`** — remove legacy plugin, `<base>`-hijack,
  form-exfiltration and clickjacking vectors respectively.
- **`upgrade-insecure-requests`** — defence in depth alongside HSTS.

## nginx caveat

`add_header` inheritance in nginx is all-or-nothing: any `location` block that
declares its own `add_header` drops every server-level header. The CSP is
therefore repeated verbatim in each `location` block that sets headers. When
the canonical string changes, update **every** occurrence in `nginx.conf`
(there are three) — a linter/grep for `Content-Security-Policy` should return
the same string on every line.
