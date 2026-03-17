# pipeline service

This service now owns the first durable write path for the bootstrap slice:

`curated RSS fixture ingest -> normalization -> deterministic synthesis -> SQLite persistence`

## Commands

Seed the local SQLite database from the shared bootstrap dataset:

```bash
node services/pipeline/cli.mjs seed-demo
```

Poll an approved curated RSS allowlist and persist run history plus live review candidates:

```bash
node services/pipeline/cli.mjs poll-curated --allowlist ./path/to/curated-feed-allowlist.json
```

Inspect the current database counts and quality checks:

```bash
node services/pipeline/cli.mjs stats
```

Inspect the persisted ingest history:

```bash
node services/pipeline/cli.mjs ingest-runs
```

## Operator Notes

For checkpoint validation, reseed, recovery, and failure interpretation, use:

- `docs/operations/curated-rss-runbook.md`
- `docs/operations/pipeline-observability.md`

## Storage

- Default database path: `data/all-seeing-eye.sqlite`
- Schema source: `schemas/all-seeing-eye-v1.sql`
- Shared bootstrap input: `fixtures/bootstrap-dataset.json`

The seed path is idempotent. Re-running `seed-demo` updates the same source,
event, claim, relationship, provenance, and confidence records instead of
duplicating them.

## What Is Live

- SQLite schema initialization
- fixture-backed curated RSS fetch with retry logging
- live curated RSS polling against an explicit allowlist, with persisted run history
- normalized `source_records`
- deterministic event, entity, relationship, claim, and confidence persistence
- provenance joins via `event_source_records` and `event_entities`
- post-write data quality checks
- analyst review status preserved across reseeds once review actions are recorded

## Prototype Limits

- live polling currently creates one deterministic event candidate and one event_fact claim per fetched item, but it does not yet extract multi-entity or relationship structure from live feeds
- synthesis remains deterministic and rule-driven rather than model-driven

The read contract remains in `services/read-api`, which can now be pointed at
the seeded SQLite database with `READ_API_DB_PATH`.
