# read API bootstrap

Recommended first endpoints:

- `GET /api/timeline`
- `GET /api/events/:eventId`

The first slice should stay read-only from this service. Review actions can be stubbed behind local handlers until the write path is finalized.
