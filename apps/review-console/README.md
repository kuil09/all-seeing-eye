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
- Filter summary shows how many events remain in view and exposes one-click reset paths when search or review filters narrow the queue too far
- Filter summary now also surfaces one-click status and confidence lanes with queue counts, so analysts can jump across likely triage slices without opening each dropdown first
- Filter controls now include review-history state so previously reviewed or untouched events can be isolated without relying on status alone
- Filter summary now also surfaces one-click analyst attention lanes for saved local drafts, pending revisits, reviewed-before items, and pending confidence slices, so unfinished notes and follow-up buckets can be reopened without restacking filters
- Analysts can save recurring filter combinations as local saved views and reapply or delete them without rebuilding the queue state manually
- Review-note drafts stay attached to each event in local browser storage while analysts move around the queue or refresh the page, and timeline cards show when a local draft note is waiting
- Review forms now expose one-click quick note starters for confidence rationale, source posture, prior review notes, and edit/reject note skeletons so required analyst notes start from grounded evidence instead of a blank field
- Keyboard shortcuts now keep the detail workflow moving without leaving the keyboard: `/` focuses search, `J`/`K` move across visible rows, `N` jumps to the next pending item, and `A`/`E`/`X` trigger review actions when analysts are not typing in inputs
- Recent activity keeps the last local review decisions visible in the controls panel, previews the latest analyst note, and restores that note into the draft editor when the event is reopened, so auto-advance does not strand the last decision or its rationale
- Timeline cards surface key participant roles before detail is opened, while avoiding duplicate location labels
- Timeline cards surface source posture and timing windows before detail is opened
- Timeline cards surface confidence drivers with claim-polarity chips and a short rationale preview before detail is opened
- When URL state is stale or missing, the detail view re-centers on the first pending event instead of an already-reviewed row
- Detail view surfaces queue context so analysts can see visible position plus remaining pending work under the current filters
- Detail view includes previous/next visible controls plus a next-pending jump so analysts can keep moving inside the filtered queue without returning to the left rail
- Search matches timeline copy plus claim text, entity names and roles, source titles and feed keys, and recorded analyst notes
- Event detail with confidence rationale, claims, entities, relationships, and source provenance
- Supporting source cards show event-relative publish timing for faster provenance inspection
- Timeline cards surface the latest review-history summary so analysts can triage prior edits without opening detail first
- API and SQLite-backed timeline responses keep tag chips derived from feed categories and event types so tag filtering remains usable outside fixture mode
- Relationship cards resolve canonical entity names and event roles instead of raw ids
- Same-origin review actions persisted through the active local read-api backend
- Recording an action on a `pending_review` event automatically advances the console to the next pending queue item when one exists
- Fixture-mode review actions kept browser-local as a fallback
- Edit and reject actions require analyst notes before the console records them
- Draft notes remain local to the browser until the corresponding review action is recorded
- Saved views remain local to the browser and capture search, review-status, review-history, confidence, tag, and saved-draft filters
- Recent activity remains local to the browser and captures the last reviewed event, the latest analyst note, and the relaxed reopen filters needed to inspect it again quickly
- URL-synced selected event, filters, source mode, and demo mode for reproducible refreshes
- Filter controls plus explicit empty and error demo states
- Default to local read API mode, with contract fixtures available as a fallback
