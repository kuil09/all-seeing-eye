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

## Current behavior

- Timeline-first analyst queue
- Event detail with confidence rationale, claims, entities, relationships, and source provenance
- Local-only approve, edit, and reject actions for demo and UX review
- Filter controls plus explicit empty and error demo states
- Default to local read API mode, with contract fixtures available as a fallback
