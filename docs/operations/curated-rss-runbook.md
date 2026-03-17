# Curated RSS Local Runbook

This runbook is the operator path for the first-slice curated RSS baseline:

`fixture-backed curated RSS -> normalization -> deterministic synthesis -> SQLite -> local read API`

Use it for the Friday, March 20, 2026 checkpoint and the Tuesday, March 24, 2026 operator handoff.

## Canonical Paths

- Dataset: `fixtures/bootstrap-dataset.json`
- Allowlist example: `fixtures/curated-feed-allowlist.example.json`
- Pipeline CLI: `services/pipeline/cli.mjs`
- Pipeline smoke test: `scripts/smoke_pipeline.sh`
- Read API entrypoint: `scripts/serve_read_api.sh`
- Default SQLite path: `data/all-seeing-eye.sqlite`

## Preconditions

- Run commands from the repository root.
- Use a temporary SQLite file for validation runs so you do not overwrite the shared local baseline by accident.
- Treat the `node:sqlite` experimental warning as expected on the current Node runtime. It is not a pipeline failure by itself.

## Fresh Seed

Create a disposable database and seed the curated fixture bundle:

```bash
tmp_dir="$(mktemp -d)"
db="$tmp_dir/all-seeing-eye.sqlite"
node services/pipeline/cli.mjs seed-demo --db "$db" --run-id "checkpoint_$(date +%s)"
```

Expected seed result:

- `fetched.feeds = 4`
- `fetched.items = 4`
- `counts.sourceRecords = 4`
- `counts.events = 2`
- `counts.entities = 5`
- `counts.relationships = 3`
- `counts.claims = 4`
- `counts.eventSourceRecords = 4`
- `counts.eventEntities = 5`
- `counts.confidenceAssessments = 13`
- every `qualityChecks[].ok` value is `true`

The command writes the machine-readable JSON result to `stdout`. Feed fetch messages and retry warnings are written to `stderr`.

## Live Curated Poll

Poll an approved curated RSS allowlist and persist run history plus live review candidates without replacing the fixture-backed baseline:

```bash
tmp_dir="$(mktemp -d)"
db="$tmp_dir/all-seeing-eye.sqlite"
allowlist="$PWD/path/to/approved-curated-feed-allowlist.json"
node services/pipeline/cli.mjs poll-curated \
  --db "$db" \
  --allowlist "$allowlist" \
  --run-id "live_poll_$(date +%s)"
```

Expected behavior:

- `stdout` includes the persisted `ingestRunId`, total feed/item counts, per-feed summaries, and the post-write table counts
- `stderr` includes per-attempt retry logs
- every successful live item also writes one normalized `source_record`, one candidate `event`, one `event_fact` claim, provenance, and confidence rows
- the command exits `0` only when every feed succeeds
- the command exits non-zero when any feed fails, but the run history is still written to SQLite for inspection

Use the repository allowlist example only as a shape reference. Live validation should point at the approved environment-specific allowlist.

## Reseed Expectations

Reseed the same database when you want to confirm idempotence or restore the fixture baseline:

```bash
node services/pipeline/cli.mjs seed-demo --db "$db" --run-id "reseed_$(date +%s)"
```

Expected behavior:

- row counts remain unchanged across reseeds
- source, event, relationship, claim, provenance, and confidence rows are updated in place instead of duplicated
- analyst review state persists after reseed once review actions have been written through the read API

## Inspect the Baseline

Inspect the seeded database snapshot:

```bash
node services/pipeline/cli.mjs stats --db "$db"
```

The `stats` payload is the primary operator inspection surface. Confirm:

- the same row counts listed above
- all four data-quality checks are `ok: true`
- the event list contains:
  - `evt_20260314_substation_outage`
  - `evt_20260314_harbor_north_inspections`
- both events remain in `reviewStatus: "pending"` until analyst actions are recorded

Inspect recent ingest history, including the last successful run, last failed run, and per-feed failure context:

```bash
node services/pipeline/cli.mjs ingest-runs --db "$db" --limit 10
```

Confirm:

- `lastSuccessfulRun` identifies the most recent clean seed or poll
- `lastFailedRun` identifies the most recent failed or partially failed poll
- `recentRuns[].feeds[]` includes `status`, `attemptCount`, `itemCount`, and `errorMessage`

## Read API Check

Point the read API at the seeded SQLite database:

```bash
READ_API_DB_PATH="$db" ./scripts/serve_read_api.sh
```

In another shell, verify the local read path:

```bash
curl -fsS http://127.0.0.1:4310/healthz
curl -fsS http://127.0.0.1:4310/api/timeline
curl -fsS http://127.0.0.1:4310/api/events/evt_20260314_harbor_north_inspections
```

For a one-command checkpoint validation, run:

```bash
npm run pipeline:smoke
```

## Recovery Procedure

### Disposable Validation Database

If a temporary validation database is wrong or stale, discard the temp directory and seed again:

```bash
rm -rf "$tmp_dir"
tmp_dir="$(mktemp -d)"
db="$tmp_dir/all-seeing-eye.sqlite"
node services/pipeline/cli.mjs seed-demo --db "$db" --run-id "recover_$(date +%s)"
```

### Shared Local Baseline

If `data/all-seeing-eye.sqlite` needs to be reset, preserve the old file before rebuilding:

```bash
mkdir -p data/backups
backup="data/backups/all-seeing-eye.$(date +%Y%m%d-%H%M%S).sqlite"
if [ -f data/all-seeing-eye.sqlite ]; then
  mv data/all-seeing-eye.sqlite "$backup"
fi
node services/pipeline/cli.mjs seed-demo --run-id "restore_$(date +%s)"
```

After recovery, rerun:

```bash
node services/pipeline/cli.mjs stats
npm run pipeline:smoke
```

## Failure Signals

Treat the following as operator-actionable failures:

- seed output includes any `qualityChecks` entry with `ok: false`
- `stats` row counts differ from the expected 4/2/5/3/4/4/5/13 baseline for the bootstrap dataset
- the CLI exits non-zero
- `stderr` includes `Curated feed fetch failed for <feedKey>: ...`
- `stderr` includes `No source records found for curated feed "<feedKey>".`
- the read API cannot serve `/healthz` or returns missing event data for known event ids

Retry warnings are surfaced as:

```text
[pipeline] fetch attempt <n>/<max> failed for <feedKey>: <message>
```

Repeated warnings for the same feed across a single run mean the seed path is degraded even if a later attempt succeeds.

For live polls, the command exits non-zero when any feed ends in `failed`, and the persisted run should be treated as degraded even if at least one feed succeeded.

## Evidence to Leave in Paperclip

When reporting a validation run, include:

- database path
- `--run-id`
- commands executed
- observed counts, quality-check status, or ingest-run status summary
- whether the result is `verified-local` or `verified-shared`
