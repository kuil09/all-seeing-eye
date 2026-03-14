# pipeline service

This service now owns the first durable write path for the bootstrap slice:

`curated RSS fixture ingest -> normalization -> deterministic synthesis -> SQLite persistence`

## Commands

Seed the local SQLite database from the shared bootstrap dataset:

```bash
node services/pipeline/cli.mjs seed-demo
```

Inspect the current database counts and quality checks:

```bash
node services/pipeline/cli.mjs stats
```

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
- normalized `source_records`
- deterministic event, entity, relationship, claim, and confidence persistence
- provenance joins via `event_source_records` and `event_entities`
- post-write data quality checks

## Prototype Limits

- RSS ingest is still fixture-backed rather than live network polling
- synthesis is deterministic and manifest-driven instead of model-driven
- review action history is not persisted in storage yet

The read contract remains in `services/read-api`, which can now be pointed at
the seeded SQLite database with `READ_API_DB_PATH`.
