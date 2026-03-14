PRAGMA foreign_keys = ON;

CREATE TABLE source_records (
  id TEXT PRIMARY KEY,
  feed_key TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  published_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  canonical_hash TEXT NOT NULL UNIQUE,
  raw_payload_json TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  language TEXT,
  ingestion_status TEXT NOT NULL DEFAULT 'captured' CHECK (
    ingestion_status IN ('captured', 'normalized', 'synthesized', 'failed')
  ),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  event_time_start TEXT NOT NULL,
  event_time_end TEXT,
  location_label TEXT,
  primary_source_record_id TEXT REFERENCES source_records(id) ON DELETE SET NULL,
  review_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (
    review_status IN ('pending_review', 'approved', 'edited', 'rejected')
  ),
  synthesis_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    synthesis_status IN ('draft', 'ready_for_review', 'accepted')
  ),
  created_by_model TEXT NOT NULL,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL CHECK (
    entity_type IN ('person', 'organization', 'facility', 'location', 'asset', 'event_tag')
  ),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  source_entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  confidence_label TEXT NOT NULL CHECK (
    confidence_label IN ('low', 'medium', 'high')
  ),
  evidence_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source_entity_id, target_entity_id, relationship_type)
);

CREATE TABLE claims (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_record_id TEXT REFERENCES source_records(id) ON DELETE SET NULL,
  claim_type TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  normalized_value_json TEXT,
  polarity TEXT NOT NULL DEFAULT 'asserted' CHECK (
    polarity IN ('asserted', 'disputed', 'uncertain')
  ),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE confidence_assessments (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (
    subject_type IN ('event', 'claim', 'relationship')
  ),
  subject_id TEXT NOT NULL,
  method TEXT NOT NULL CHECK (
    method IN ('heuristic', 'model', 'analyst')
  ),
  model_name TEXT,
  score REAL NOT NULL CHECK (
    score >= 0.0 AND score <= 1.0
  ),
  rationale TEXT NOT NULL,
  assessed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_source_records (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_record_id TEXT NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (
    role IN ('primary', 'supporting', 'contradicting')
  ),
  excerpt TEXT,
  PRIMARY KEY (event_id, source_record_id)
);

CREATE TABLE event_entities (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  PRIMARY KEY (event_id, entity_id, role)
);

CREATE TABLE claim_source_records (
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  source_record_id TEXT NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  excerpt TEXT,
  PRIMARY KEY (claim_id, source_record_id)
);

CREATE TABLE claim_entities (
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  PRIMARY KEY (claim_id, entity_id, role)
);

CREATE TABLE review_actions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (
    action IN ('approve', 'edit', 'reject')
  ),
  actor_type TEXT NOT NULL CHECK (
    actor_type IN ('analyst', 'system')
  ),
  actor_name TEXT NOT NULL,
  notes TEXT,
  patch_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_source_records_feed_key ON source_records (feed_key, published_at DESC);
CREATE INDEX idx_events_review_status ON events (review_status, event_time_start DESC);
CREATE INDEX idx_claims_event_id ON claims (event_id);
CREATE INDEX idx_confidence_subject ON confidence_assessments (subject_type, subject_id);
