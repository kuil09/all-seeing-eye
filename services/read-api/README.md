# read API bootstrap

The first slice keeps this service read-only and fixture-backed until the
pipeline starts writing live SQLite data.

## Available endpoints

- `GET /healthz`
- `GET /api/timeline`
- `GET /api/events/:eventId`
- `POST /api/events/:eventId/review-actions`

## Local run

```bash
./scripts/serve_read_api.sh
```

Optional environment variables:

- `PORT` defaults to `4310`
- `HOST` defaults to `127.0.0.1`
- `REVIEW_ACTIONS_FILE` defaults to `data/review-actions.json`

The current implementation serves timeline and event-detail payloads derived from
`fixtures/bootstrap-dataset.json` so product work can switch from static
contract files to stable HTTP routes without waiting for pipeline persistence.

To read live SQLite-backed data after seeding the pipeline, set:

```bash
READ_API_DB_PATH=data/all-seeing-eye.sqlite ./scripts/serve_read_api.sh
```

Without `READ_API_DB_PATH`, the service stays on the fixture backend.

`POST /api/events/:eventId/review-actions` remains local-only. It writes analyst
review state into the overlay file so refreshed `GET /api/timeline` and
`GET /api/events/:eventId` responses reflect approve, edit, and reject actions
without changing the shared storage contract.

`approve` accepts optional notes. `edit` and `reject` require analyst notes so
the persisted review history keeps an explicit rationale.
