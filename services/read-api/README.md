# read API bootstrap

The first slice keeps this service read-only and fixture-backed until the
pipeline starts writing live SQLite data.

## Available endpoints

- `GET /healthz`
- `GET /api/timeline`
- `GET /api/events/:eventId`

## Local run

```bash
./scripts/serve_read_api.sh
```

Optional environment variables:

- `PORT` defaults to `4310`
- `HOST` defaults to `127.0.0.1`

The current implementation serves timeline and event-detail payloads derived from
`fixtures/bootstrap-dataset.json` so product work can switch from static
contract files to stable HTTP routes without waiting for pipeline persistence.
