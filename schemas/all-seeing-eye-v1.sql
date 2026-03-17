PRAGMA foreign_keys = ON;

-- Mirrored from the NIT-12 architecture package to keep the shared repo
-- storage baseline aligned with the company-wide execution package.

-- Core source item storage for curated RSS ingestion.
CREATE TABLE source_records (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('rss')),
    source_key TEXT NOT NULL,
    external_id TEXT,
    canonical_url TEXT NOT NULL,
    feed_url TEXT NOT NULL,
    title TEXT,
    body_text TEXT NOT NULL,
    summary_text TEXT,
    language_code TEXT,
    author_name TEXT,
    published_at TEXT,
    fetched_at TEXT NOT NULL,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    raw_payload TEXT NOT NULL,
    ingest_run_id TEXT NOT NULL,
    normalization_version TEXT NOT NULL,
    synthesis_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (synthesis_status IN ('pending', 'processing', 'ready', 'failed', 'ignored')),
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1))
);

CREATE UNIQUE INDEX idx_source_records_source_external
    ON source_records (source_type, source_key, external_id)
    WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX idx_source_records_canonical_hash
    ON source_records (source_type, canonical_url, content_hash);

CREATE INDEX idx_source_records_published_at
    ON source_records (published_at);

CREATE INDEX idx_source_records_synthesis_status
    ON source_records (synthesis_status);

-- Operator-facing ingest execution history.
CREATE TABLE ingest_runs (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL
        CHECK (mode IN ('fixture_seed', 'live_poll')),
    status TEXT NOT NULL
        CHECK (status IN ('running', 'succeeded', 'partial_failure', 'failed')),
    started_at TEXT NOT NULL,
    completed_at TEXT,
    dataset_path TEXT,
    allowlist_path TEXT,
    feed_count INTEGER NOT NULL DEFAULT 0,
    succeeded_feed_count INTEGER NOT NULL DEFAULT 0,
    failed_feed_count INTEGER NOT NULL DEFAULT 0,
    item_count INTEGER NOT NULL DEFAULT 0,
    persisted_source_record_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_ingest_runs_started_at
    ON ingest_runs (started_at DESC);

CREATE INDEX idx_ingest_runs_status
    ON ingest_runs (status, started_at DESC);

CREATE TABLE ingest_run_feeds (
    ingest_run_id TEXT NOT NULL,
    feed_key TEXT NOT NULL,
    feed_url TEXT NOT NULL,
    feed_category TEXT,
    status TEXT NOT NULL
        CHECK (status IN ('succeeded', 'failed')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    item_count INTEGER NOT NULL DEFAULT 0,
    latest_published_at TEXT,
    error_message TEXT,
    last_http_status INTEGER,
    response_content_type TEXT,
    fetched_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (ingest_run_id, feed_key),
    FOREIGN KEY (ingest_run_id) REFERENCES ingest_runs (id) ON DELETE CASCADE
);

CREATE INDEX idx_ingest_run_feeds_status
    ON ingest_run_feeds (status);

-- Timeline object reviewed by the analyst.
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary_text TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'candidate'
        CHECK (status IN ('candidate', 'reviewed', 'published', 'rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
    start_at TEXT,
    end_at TEXT,
    timezone TEXT,
    location_name TEXT,
    latitude REAL,
    longitude REAL,
    geography_precision TEXT NOT NULL DEFAULT 'none'
        CHECK (geography_precision IN ('none', 'approximate', 'exact')),
    first_source_record_id TEXT,
    analyst_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (first_source_record_id) REFERENCES source_records (id)
);

CREATE INDEX idx_events_start_at
    ON events (start_at);

CREATE INDEX idx_events_review_status
    ON events (review_status, start_at);

CREATE INDEX idx_events_status
    ON events (status);

-- Canonical object store for extracted actors, places, and digital objects.
CREATE TABLE entities (
    id TEXT PRIMARY KEY,
    canonical_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    entity_type TEXT NOT NULL
        CHECK (entity_type IN ('person', 'organization', 'place', 'asset', 'account', 'other')),
    description TEXT,
    country_code TEXT,
    external_refs_json TEXT NOT NULL DEFAULT '{}',
    first_observed_at TEXT,
    last_observed_at TEXT,
    merge_status TEXT NOT NULL DEFAULT 'active'
        CHECK (merge_status IN ('active', 'merged', 'discarded')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_entities_type_name
    ON entities (entity_type, normalized_name);

CREATE INDEX idx_entities_merge_status
    ON entities (merge_status);

-- Typed edge between two entities, optionally tied to a single event.
CREATE TABLE relationships (
    id TEXT PRIMARY KEY,
    subject_entity_id TEXT NOT NULL,
    predicate TEXT NOT NULL,
    object_entity_id TEXT NOT NULL,
    event_id TEXT,
    directionality TEXT NOT NULL DEFAULT 'directed'
        CHECK (directionality IN ('directed', 'undirected')),
    status TEXT NOT NULL DEFAULT 'candidate'
        CHECK (status IN ('candidate', 'reviewed', 'published', 'rejected')),
    valid_from TEXT,
    valid_to TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (subject_entity_id) REFERENCES entities (id),
    FOREIGN KEY (object_entity_id) REFERENCES entities (id),
    FOREIGN KEY (event_id) REFERENCES events (id)
);

CREATE INDEX idx_relationships_subject_predicate_object
    ON relationships (subject_entity_id, predicate, object_entity_id);

CREATE INDEX idx_relationships_event
    ON relationships (event_id);

-- Atomic assertion extracted from one source record.
CREATE TABLE claims (
    id TEXT PRIMARY KEY,
    source_record_id TEXT NOT NULL,
    event_id TEXT,
    subject_entity_id TEXT,
    object_entity_id TEXT,
    relationship_id TEXT,
    claim_type TEXT NOT NULL
        CHECK (claim_type IN ('event_fact', 'entity_fact', 'relationship_fact', 'classification')),
    predicate TEXT NOT NULL,
    object_value_json TEXT NOT NULL,
    claim_text TEXT NOT NULL,
    polarity TEXT NOT NULL DEFAULT 'supports'
        CHECK (polarity IN ('supports', 'contradicts', 'uncertain')),
    extraction_method TEXT NOT NULL
        CHECK (extraction_method IN ('rule', 'model', 'analyst')),
    extractor_version TEXT NOT NULL,
    evidence_span_start INTEGER,
    evidence_span_end INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (source_record_id) REFERENCES source_records (id),
    FOREIGN KEY (event_id) REFERENCES events (id),
    FOREIGN KEY (subject_entity_id) REFERENCES entities (id),
    FOREIGN KEY (object_entity_id) REFERENCES entities (id),
    FOREIGN KEY (relationship_id) REFERENCES relationships (id),
    CHECK (
        event_id IS NOT NULL
        OR subject_entity_id IS NOT NULL
        OR relationship_id IS NOT NULL
    )
);

CREATE INDEX idx_claims_source_record
    ON claims (source_record_id);

CREATE INDEX idx_claims_event
    ON claims (event_id);

CREATE INDEX idx_claims_subject_entity
    ON claims (subject_entity_id);

CREATE INDEX idx_claims_relationship
    ON claims (relationship_id);

-- Join table for event-level provenance.
CREATE TABLE event_source_records (
    event_id TEXT NOT NULL,
    source_record_id TEXT NOT NULL,
    role TEXT NOT NULL
        CHECK (role IN ('trigger', 'supporting', 'contradicting')),
    PRIMARY KEY (event_id, source_record_id),
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    FOREIGN KEY (source_record_id) REFERENCES source_records (id) ON DELETE CASCADE
);

CREATE INDEX idx_event_source_records_role
    ON event_source_records (role);

-- Join table for rendering event participants in the review UI.
CREATE TABLE event_entities (
    event_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    role TEXT NOT NULL
        CHECK (role IN ('actor', 'target', 'observer', 'location', 'organization', 'other')),
    PRIMARY KEY (event_id, entity_id, role),
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES entities (id) ON DELETE CASCADE
);

CREATE INDEX idx_event_entities_role
    ON event_entities (role);

-- Explicit confidence history for explainability and analyst audit.
CREATE TABLE confidence_assessments (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL
        CHECK (target_type IN ('source_record', 'event', 'entity', 'relationship', 'claim')),
    target_id TEXT NOT NULL,
    assessment_level TEXT NOT NULL DEFAULT 'current'
        CHECK (assessment_level IN ('current', 'historical')),
    overall_score REAL NOT NULL
        CHECK (overall_score >= 0.0 AND overall_score <= 1.0),
    source_reliability_score REAL
        CHECK (source_reliability_score IS NULL OR (source_reliability_score >= 0.0 AND source_reliability_score <= 1.0)),
    extraction_quality_score REAL
        CHECK (extraction_quality_score IS NULL OR (extraction_quality_score >= 0.0 AND extraction_quality_score <= 1.0)),
    corroboration_score REAL
        CHECK (corroboration_score IS NULL OR (corroboration_score >= 0.0 AND corroboration_score <= 1.0)),
    recency_score REAL
        CHECK (recency_score IS NULL OR (recency_score >= 0.0 AND recency_score <= 1.0)),
    assessed_by_type TEXT NOT NULL
        CHECK (assessed_by_type IN ('rule', 'model', 'analyst')),
    assessed_by_id TEXT NOT NULL,
    rationale TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_confidence_target_created_at
    ON confidence_assessments (target_type, target_id, created_at DESC);

-- Analyst review history persisted alongside the SQLite event baseline.
CREATE TABLE review_actions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    action TEXT NOT NULL
        CHECK (action IN ('approve', 'edit', 'reject')),
    actor_type TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
);

CREATE INDEX idx_review_actions_event_created_at
    ON review_actions (event_id, created_at DESC, id DESC);
