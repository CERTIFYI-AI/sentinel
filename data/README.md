# data/

Static datasets used by the Sentinel backend and evaluation pipelines.

| File | Purpose |
| :--- | :--- |
| `eval_dataset.jsonl` | Golden Q/A pairs for the answer-verification evals. |
| `injection_seeds.jsonl` | **Defensive red-team corpus**: known prompt-injection and jailbreak patterns used to *test and harden* the policy firewall and guardrails (see Security → Red Teaming). It exists so Sentinel can detect these attacks — not to enable them. Additions must map to a detection rule or an eval case. |
| `sentinel-seed-data.sql` | Legacy demo seed for the standalone FastAPI/Postgres deployment. |

**All content here is fictional or publicly documented.** No customer data,
no real user prompts, no proprietary attack tooling. Prompt-injection
patterns are drawn from public security research; shipping them in the open
is standard practice for defensive scanners (cf. OWASP LLM Top 10 corpora).
