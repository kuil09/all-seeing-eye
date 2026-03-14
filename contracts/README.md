# Shared Contract Package

This directory is the canonical read-contract handoff between the ingestion and product tracks.

## Contents

- `json-schemas/` defines the expected API response shapes
- `examples/` provides concrete payloads for fixture-driven development

The JSON schema files are intentionally small and easy to diff. Keep them aligned with the SQLite schema and the fixture dataset.
