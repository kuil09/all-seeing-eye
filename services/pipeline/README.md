# pipeline service bootstrap

Recommended first files for the platform track:

- `rss_fetcher.*`
- `normalizer.*`
- `synthesis_worker.*`
- `seed_loader.*`
- `sqlite_store.*`

The service should own write paths only. Keep analyst-facing reads in `services/read-api`.
