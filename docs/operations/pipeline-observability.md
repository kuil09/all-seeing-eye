# Pipeline Observability And Data Quality Notes

This note defines the minimum operator-facing observability surface for the first-slice platform lane before the Friday, March 20, 2026 checkpoint and the Tuesday, March 24, 2026 runbook handoff.

## Primary Signals

### Seed Command Output

`node services/pipeline/cli.mjs seed-demo` exposes three operator signals in one run:

- fetch scope: `fetched.feeds` and `fetched.items`
- storage result: the table counts in `counts`
- data quality: the boolean checks in `qualityChecks`

Use a unique `--run-id` for every validation, recovery, or checkpoint run so issue comments can point to an exact execution.

`node services/pipeline/cli.mjs poll-curated --allowlist <path>` adds the live network preflight path. It persists the same `--run-id` into `ingest_runs`, so operators can inspect the exact poll outcome later without preserving shell scrollback.

### Retry Logging

The curated RSS loader emits per-feed fetch information and retry warnings to `stderr`:

- success example: `[pipeline] fetched 1 items from east-grid-operations on attempt 1.`
- retry example: `[pipeline] fetch attempt 2/3 failed for east-grid-operations: <message>`

No external logging backend exists in this slice yet, so preserving `stderr` alongside the JSON result is the current run-level audit trail.

### Stats Snapshot

`node services/pipeline/cli.mjs stats --db <path>` is the canonical post-run inspection surface. It should be used after every seed, reseed, and recovery action.

### Persisted Ingest History

`node services/pipeline/cli.mjs ingest-runs --db <path>` is the canonical run-history surface for:

- the most recent fully successful ingest
- the most recent failed or partially failed ingest
- per-feed retry/failure context

## Bootstrap Baseline

The current fixture-backed baseline is healthy only when the following counts are present:

| Table | Expected rows |
| --- | --- |
| `source_records` | 4 |
| `events` | 2 |
| `entities` | 5 |
| `relationships` | 3 |
| `claims` | 4 |
| `event_source_records` | 4 |
| `event_entities` | 5 |
| `confidence_assessments` | 13 |

The event list should remain:

- `evt_20260314_substation_outage`
- `evt_20260314_harbor_north_inspections`

## Required Data-Quality Checks

All of the following checks must remain green:

| Check id | Why it matters |
| --- | --- |
| `events_with_sources` | every event has provenance evidence |
| `events_with_confidence` | every event has an explainable confidence record |
| `ready_source_records` | normalized source records reached the ready state |
| `claims_linked_to_events` | event claims are still attached to an event record |

If any check flips to `false`, treat the baseline as failed even if row counts look correct.

## Operator Triage

Use this order when a validation run looks wrong:

1. Re-run `seed-demo` against a disposable database to separate code regressions from local database drift.
2. Compare the new `stats` output against the expected baseline counts and check ids.
3. Start the read API against the same database and verify `/api/timeline` plus a known event detail payload.
4. Run `npm run pipeline:smoke` to confirm the integrated seed plus read path still holds.

## Known Limits

- live curated polling now writes normalized source records plus one deterministic event and claim candidate per fetched item, but it still does not extract multi-entity or relationship structure from live feeds
- there is still no separate dashboard or alert transport; the operator surface remains SQLite-backed CLI inspection

These limits are acceptable for the March 18 and March 20 checkpoint baseline, but they should not stay implicit after the March 24 operator handoff. The explicit follow-up issue is `NIT-61`, `Platform follow-up: live curated RSS polling and ingest run history`.
