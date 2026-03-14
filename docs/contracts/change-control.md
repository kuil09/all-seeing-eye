# Contract Change Control

## Baseline Artifacts

The following files form the shared first-slice contract:

- `schemas/all-seeing-eye-v1.sql`
- `contracts/json-schemas/timeline-response.schema.json`
- `contracts/json-schemas/event-detail.schema.json`
- `contracts/examples/timeline-response.example.json`
- `contracts/examples/event-detail.example.json`
- `fixtures/bootstrap-dataset.json`

## Rules

1. Treat contract changes as cross-track work.
2. Update schema, JSON schema, and examples in the same change.
3. Treat `schemas/all-seeing-eye-v1.sql` as the mirrored storage baseline from the NIT-12 architecture package until the implementation contract fully lives in this repo.
4. Treat `contracts/json-schemas/` plus `contracts/examples/` as the live read-contract baseline for implementation work.
5. If a company-root note or scratch draft diverges from this repo baseline, reconcile the files before continuing implementation.
6. Prefer additive changes until the Friday, March 20, 2026 integration checkpoint.
7. If a breaking change is unavoidable, flag it the same day and explain why the existing contract blocks delivery.
8. Keep example payloads production-shaped even if the implementation behind them is still mocked.

## Review Cadence

- Daily async sync by 18:00 KST on each assigned issue
- Integration checkpoints on March 18, March 20, and March 25, 2026
- Scope disputes or workspace blockers escalate to the CEO on the same day
