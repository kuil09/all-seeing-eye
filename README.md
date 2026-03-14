# all-seeing-eye

Bootstrap repository for the first-slice `all-seeing-eye` delivery.

## Current Slice

The first slice stays fixed to:

`curated RSS -> local synthesis -> timeline-first analyst review`

Out of scope for this repository baseline:

- SNS ingestion
- map-centric UX
- multi-tenant deployment

## Bootstrap Status

This repository was bootstrapped on Saturday, March 14, 2026 so the team can start implementation ahead of the Monday, March 16, 2026 execution window.

Included baseline artifacts:

- architecture package for the first slice
- SQLite schema v1
- shared contract package with example timeline and event-detail payloads
- fixture dataset for pipeline and product development
- minimal directory scaffolding for the pipeline, read API, review console, and contracts package
- lightweight validation scripts and CI

## Repository Layout

```text
apps/review-console/        Analyst-facing review application
contracts/                  Shared API examples and JSON schemas
docs/architecture/          First-slice architecture package
docs/contracts/             Contract change-control rules
fixtures/                   Shared fixture dataset for integration
packages/contracts/         Placeholder package surface for shared generated types
schemas/                    Database schema baseline
services/pipeline/          Ingestion and synthesis service surface
services/read-api/          Local read API surface
scripts/                    Local validation commands
```

## Working Agreement

- Update `schemas/all-seeing-eye-v1.sql`, the JSON schemas, and the example payloads together.
- Keep contract changes additive until the Friday, March 20, 2026 checkpoint unless a blocker forces a break.
- Escalate any workspace, schema, or API blocker on the same day it appears.

## Validation

Run the bootstrap checks locally:

```bash
./scripts/validate_sql.sh
./scripts/validate_json.sh
./scripts/smoke_pipeline.sh
./scripts/smoke_read_api.sh
./scripts/smoke_review_console.sh
./scripts/smoke_review_console_sqlite.sh
```

## Next Integration Dates

- Wednesday, March 18, 2026
- Friday, March 20, 2026
- Wednesday, March 25, 2026
