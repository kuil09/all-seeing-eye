# All-Seeing Eye First-Slice Architecture Package

## Objective

Deliver a local, demo-ready workflow that turns curated RSS items into reviewable events with provenance and confidence visible to an analyst.

## Fixed Scope

- Ingest curated RSS feeds only
- Persist raw captures and normalized source records
- Synthesize candidate events, claims, entities, and relationships locally
- Expose a local read API for the review application
- Support analyst review actions on the synthesized event detail view

## Explicit Non-Goals

- Direct SNS ingestion
- Geospatial map workflows
- multi-tenant auth, RBAC, or deployment surfaces
- hosted LLM dependency for the first slice

## End-to-End Flow

1. The pipeline polls a curated RSS source list on a schedule.
2. Each fetched item is persisted as a `source_record` with a canonical hash for idempotency.
3. A local synthesis worker converts normalized source text into candidate `events`, `claims`, `entities`, and `relationships`.
4. Provenance joins connect every reviewable artifact back to the source records that support or contradict it.
5. Confidence assessments are written for events, claims, and relationships.
6. The local read API exposes a timeline list and event detail payload shaped for the review console.
7. An analyst approves, edits, or rejects an event while preserving provenance and review history.

## Component Map

### `services/pipeline`

Responsibilities:

- RSS polling and fetch retries
- raw capture and normalization
- idempotent persistence into SQLite
- local synthesis orchestration
- fixture and seed dataset loading

### `services/read-api`

Responsibilities:

- serve timeline and event detail payloads
- enforce a stable read contract for product work
- keep write responsibilities out of the first-slice API

### `apps/review-console`

Responsibilities:

- timeline-first analyst review workflow
- event detail with provenance and confidence visibility
- review actions: approve, edit, reject

### `packages/contracts`

Responsibilities:

- hold the stable contract boundary across platform and product work
- mirror the JSON schema and example payloads published in `contracts/`

## Storage Choice

SQLite is the first-slice system of record.

Reasons:

- simple local setup for all engineers
- deterministic demo environment
- enough relational structure for provenance joins and review state
- easy reset and fixture loading for checkpoint demos

## Local Model Stack

The first slice assumes a local inference runtime only.

- Primary synthesis model: `qwen2.5:7b-instruct`
- Optional fast triage model: `llama3.2:3b`
- Output mode: strict JSON validated against the shared contract before persistence

The pipeline should keep prompts and model wrappers replaceable. The contract matters more than the exact local runtime.

## Contract Rules

- `schemas/all-seeing-eye-v1.sql` is the storage baseline.
- `contracts/json-schemas/` defines the read contract.
- `contracts/examples/` contains the canonical response examples.
- `fixtures/bootstrap-dataset.json` is the shared seed dataset for the first checkpoint.

Any contract change must update all four surfaces together.

## Done Criteria For The Bootstrap

- the repository points at `https://github.com/kuil09/all-seeing-eye`
- the schema executes cleanly in SQLite
- fixture and example JSON files parse cleanly
- platform and product engineers have stable starting paths in the repository
