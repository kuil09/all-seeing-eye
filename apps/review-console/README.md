# review console bootstrap

Recommended first routes:

- `/timeline`
- `/events/:eventId`

The local read API is now available for the first analyst loop, with fixture mode kept as a
fallback for UX and contract checks.

## Local run

From the repository root:

```bash
npm run review-console:dev
```

Then open `http://127.0.0.1:4173/apps/review-console/`.

To make the same-origin `/api/*` routes read seeded SQLite data instead of
fixtures, start the console with:

```bash
READ_API_DB_PATH=data/all-seeing-eye.sqlite npm run review-console:dev
```

Smoke test the integrated route surface:

```bash
npm run review-console:smoke
npm run review-console:smoke:sqlite
```

API-mode review actions persist to `data/review-actions.json` by default. To keep
that local overlay somewhere else during fixture-backed testing, set:

```bash
REVIEW_ACTIONS_FILE=/tmp/review-actions.json npm run review-console:dev
```

When `READ_API_DB_PATH` is set, API-mode review actions are stored in the
SQLite `review_actions` table instead of the overlay file.

`edit` and `reject` actions require analyst notes. `approve` can still be
recorded without notes for quick triage.

## Current behavior

- Timeline-first analyst queue
- Timeline cards surface source posture and timing windows before detail is opened
- Timeline cards surface confidence drivers with claim-polarity chips and a short rationale preview before detail is opened
- Search matches timeline copy plus claim text, entity names and roles, source titles and feed keys, and recorded analyst notes
- Event detail with confidence rationale, claims, entities, relationships, and source provenance
- Supporting source cards show event-relative publish timing for faster provenance inspection
- Timeline cards surface the latest review-history summary so analysts can triage prior edits without opening detail first
- API and SQLite-backed timeline responses keep tag chips derived from feed categories and event types so tag filtering remains usable outside fixture mode
- Relationship cards resolve canonical entity names and event roles instead of raw ids
- Same-origin review actions persisted through the active local read-api backend
- Fixture-mode review actions kept browser-local as a fallback
- Edit and reject actions require analyst notes before the console records them
- URL-synced selected event, filters, source mode, and demo mode for reproducible refreshes
- Filter controls plus explicit empty and error demo states
- Default to local read API mode, with contract fixtures available as a fallback
