import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_DB_PATH = "data/all-seeing-eye.sqlite";

export function resolveDatabasePath(repoRoot, dbPath = process.env.PIPELINE_DB_PATH) {
  if (!dbPath) {
    return path.join(repoRoot, DEFAULT_DB_PATH);
  }

  return path.isAbsolute(dbPath) ? dbPath : path.join(repoRoot, dbPath);
}

export function openPipelineStore({ repoRoot, dbPath }) {
  const resolvedDbPath = resolveDatabasePath(repoRoot, dbPath);
  mkdirSync(path.dirname(resolvedDbPath), { recursive: true });

  const database = new DatabaseSync(resolvedDbPath);
  database.exec("PRAGMA foreign_keys = ON;");

  return new PipelineStore({
    database,
    repoRoot,
    dbPath: resolvedDbPath
  });
}

class PipelineStore {
  constructor({ database, repoRoot, dbPath }) {
    this.database = database;
    this.repoRoot = repoRoot;
    this.dbPath = dbPath;
    this.statements = null;
  }

  initializeSchema() {
    const schemaAlreadyPresent = this.database
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM sqlite_master
          WHERE type = 'table' AND name = 'source_records'
        `
      )
      .get().count;

    if (schemaAlreadyPresent > 0) {
      if (!this.statements) {
        this.statements = createStatements(this.database);
      }
      return;
    }

    const schemaPath = path.join(this.repoRoot, "schemas/all-seeing-eye-v1.sql");
    const schemaSql = readFileSync(schemaPath, "utf8");
    this.database.exec(schemaSql);
    this.statements = createStatements(this.database);
  }

  transaction(callback) {
    this.database.exec("BEGIN");

    try {
      const result = callback(this);
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  replaceSeededState(bundle) {
    for (const event of bundle.events) {
      this.statements.deleteEventSourceLinks.run({ event_id: event.id });
      this.statements.deleteEventEntityLinks.run({ event_id: event.id });
    }

    for (const sourceRecord of bundle.sourceRecords) {
      this.statements.upsertSourceRecord.run(sourceRecord);
    }

    for (const entity of bundle.entities) {
      this.statements.upsertEntity.run(entity);
    }

    for (const event of bundle.events) {
      this.statements.upsertEvent.run(event);
    }

    for (const relationship of bundle.relationships) {
      this.statements.upsertRelationship.run(relationship);
    }

    for (const claim of bundle.claims) {
      this.statements.upsertClaim.run(claim);
    }

    for (const link of bundle.eventSourceRecords) {
      this.statements.upsertEventSourceRecord.run(link);
    }

    for (const link of bundle.eventEntities) {
      this.statements.upsertEventEntity.run(link);
    }

    for (const assessment of bundle.confidenceAssessments) {
      this.statements.upsertConfidenceAssessment.run(assessment);
    }

    for (const sourceRecord of bundle.sourceRecords) {
      this.statements.markSourceRecordReady.run({ id: sourceRecord.id });
    }
  }

  getTableCounts() {
    return {
      sourceRecords: this.countRows("source_records"),
      events: this.countRows("events"),
      entities: this.countRows("entities"),
      relationships: this.countRows("relationships"),
      claims: this.countRows("claims"),
      eventSourceRecords: this.countRows("event_source_records"),
      eventEntities: this.countRows("event_entities"),
      confidenceAssessments: this.countRows("confidence_assessments")
    };
  }

  runDataQualityChecks() {
    const checks = [
      createCheck(
        "events_with_sources",
        this.scalar(`
          SELECT COUNT(*)
          FROM events
          WHERE id NOT IN (SELECT DISTINCT event_id FROM event_source_records)
        `) === 0,
        "Every event has at least one provenance source record."
      ),
      createCheck(
        "events_with_confidence",
        this.scalar(`
          SELECT COUNT(*)
          FROM events
          WHERE id NOT IN (
            SELECT DISTINCT target_id
            FROM confidence_assessments
            WHERE target_type = 'event'
          )
        `) === 0,
        "Every event has a persisted confidence assessment."
      ),
      createCheck(
        "ready_source_records",
        this.scalar(`
          SELECT COUNT(*)
          FROM source_records
          WHERE synthesis_status != 'ready'
        `) === 0,
        "Every normalized source record reached ready synthesis state."
      ),
      createCheck(
        "claims_linked_to_events",
        this.scalar(`
          SELECT COUNT(*)
          FROM claims
          WHERE event_id IS NULL
        `) === 0,
        "Every bootstrap claim is linked to an event."
      )
    ];

    return checks;
  }

  listEvents() {
    return this.database
      .prepare(
        `
          SELECT
            id,
            title,
            review_status AS reviewStatus,
            start_at AS eventTime
          FROM events
          ORDER BY start_at DESC
        `
      )
      .all();
  }

  close() {
    this.database.close();
  }

  countRows(tableName) {
    return this.scalar(`SELECT COUNT(*) FROM ${tableName}`);
  }

  scalar(sql) {
    const row = this.database.prepare(sql).get();
    return Number(Object.values(row)[0]);
  }
}

function createStatements(database) {
  return {
    upsertSourceRecord: database.prepare(`
      INSERT INTO source_records (
        id,
        source_type,
        source_key,
        external_id,
        canonical_url,
        feed_url,
        title,
        body_text,
        summary_text,
        language_code,
        author_name,
        published_at,
        fetched_at,
        first_seen_at,
        last_seen_at,
        content_hash,
        raw_payload,
        ingest_run_id,
        normalization_version,
        synthesis_status,
        is_deleted
      ) VALUES (
        :id,
        :source_type,
        :source_key,
        :external_id,
        :canonical_url,
        :feed_url,
        :title,
        :body_text,
        :summary_text,
        :language_code,
        :author_name,
        :published_at,
        :fetched_at,
        :first_seen_at,
        :last_seen_at,
        :content_hash,
        :raw_payload,
        :ingest_run_id,
        :normalization_version,
        :synthesis_status,
        :is_deleted
      )
      ON CONFLICT(id) DO UPDATE SET
        source_type = excluded.source_type,
        source_key = excluded.source_key,
        external_id = excluded.external_id,
        canonical_url = excluded.canonical_url,
        feed_url = excluded.feed_url,
        title = excluded.title,
        body_text = excluded.body_text,
        summary_text = excluded.summary_text,
        language_code = excluded.language_code,
        author_name = excluded.author_name,
        published_at = excluded.published_at,
        fetched_at = excluded.fetched_at,
        first_seen_at = excluded.first_seen_at,
        last_seen_at = excluded.last_seen_at,
        content_hash = excluded.content_hash,
        raw_payload = excluded.raw_payload,
        ingest_run_id = excluded.ingest_run_id,
        normalization_version = excluded.normalization_version,
        synthesis_status = excluded.synthesis_status,
        is_deleted = excluded.is_deleted
    `),
    upsertEntity: database.prepare(`
      INSERT INTO entities (
        id,
        canonical_name,
        normalized_name,
        display_name,
        entity_type,
        description,
        country_code,
        external_refs_json,
        first_observed_at,
        last_observed_at,
        merge_status,
        created_at,
        updated_at
      ) VALUES (
        :id,
        :canonical_name,
        :normalized_name,
        :display_name,
        :entity_type,
        :description,
        :country_code,
        :external_refs_json,
        :first_observed_at,
        :last_observed_at,
        :merge_status,
        :created_at,
        :updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        canonical_name = excluded.canonical_name,
        normalized_name = excluded.normalized_name,
        display_name = excluded.display_name,
        entity_type = excluded.entity_type,
        description = excluded.description,
        country_code = excluded.country_code,
        external_refs_json = excluded.external_refs_json,
        first_observed_at = excluded.first_observed_at,
        last_observed_at = excluded.last_observed_at,
        merge_status = excluded.merge_status,
        updated_at = excluded.updated_at
    `),
    upsertEvent: database.prepare(`
      INSERT INTO events (
        id,
        slug,
        title,
        summary_text,
        event_type,
        status,
        review_status,
        start_at,
        end_at,
        timezone,
        location_name,
        latitude,
        longitude,
        geography_precision,
        first_source_record_id,
        analyst_notes,
        created_at,
        updated_at
      ) VALUES (
        :id,
        :slug,
        :title,
        :summary_text,
        :event_type,
        :status,
        :review_status,
        :start_at,
        :end_at,
        :timezone,
        :location_name,
        :latitude,
        :longitude,
        :geography_precision,
        :first_source_record_id,
        :analyst_notes,
        :created_at,
        :updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        title = excluded.title,
        summary_text = excluded.summary_text,
        event_type = excluded.event_type,
        status = excluded.status,
        review_status = events.review_status,
        start_at = excluded.start_at,
        end_at = excluded.end_at,
        timezone = excluded.timezone,
        location_name = excluded.location_name,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        geography_precision = excluded.geography_precision,
        first_source_record_id = excluded.first_source_record_id,
        analyst_notes = COALESCE(events.analyst_notes, excluded.analyst_notes),
        updated_at = excluded.updated_at
    `),
    upsertRelationship: database.prepare(`
      INSERT INTO relationships (
        id,
        subject_entity_id,
        predicate,
        object_entity_id,
        event_id,
        directionality,
        status,
        valid_from,
        valid_to,
        created_at,
        updated_at
      ) VALUES (
        :id,
        :subject_entity_id,
        :predicate,
        :object_entity_id,
        :event_id,
        :directionality,
        :status,
        :valid_from,
        :valid_to,
        :created_at,
        :updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        subject_entity_id = excluded.subject_entity_id,
        predicate = excluded.predicate,
        object_entity_id = excluded.object_entity_id,
        event_id = excluded.event_id,
        directionality = excluded.directionality,
        status = excluded.status,
        valid_from = excluded.valid_from,
        valid_to = excluded.valid_to,
        updated_at = excluded.updated_at
    `),
    upsertClaim: database.prepare(`
      INSERT INTO claims (
        id,
        source_record_id,
        event_id,
        subject_entity_id,
        object_entity_id,
        relationship_id,
        claim_type,
        predicate,
        object_value_json,
        claim_text,
        polarity,
        extraction_method,
        extractor_version,
        evidence_span_start,
        evidence_span_end,
        created_at,
        updated_at
      ) VALUES (
        :id,
        :source_record_id,
        :event_id,
        :subject_entity_id,
        :object_entity_id,
        :relationship_id,
        :claim_type,
        :predicate,
        :object_value_json,
        :claim_text,
        :polarity,
        :extraction_method,
        :extractor_version,
        :evidence_span_start,
        :evidence_span_end,
        :created_at,
        :updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        source_record_id = excluded.source_record_id,
        event_id = excluded.event_id,
        subject_entity_id = excluded.subject_entity_id,
        object_entity_id = excluded.object_entity_id,
        relationship_id = excluded.relationship_id,
        claim_type = excluded.claim_type,
        predicate = excluded.predicate,
        object_value_json = excluded.object_value_json,
        claim_text = excluded.claim_text,
        polarity = excluded.polarity,
        extraction_method = excluded.extraction_method,
        extractor_version = excluded.extractor_version,
        evidence_span_start = excluded.evidence_span_start,
        evidence_span_end = excluded.evidence_span_end,
        updated_at = excluded.updated_at
    `),
    upsertEventSourceRecord: database.prepare(`
      INSERT INTO event_source_records (
        event_id,
        source_record_id,
        role
      ) VALUES (
        :event_id,
        :source_record_id,
        :role
      )
      ON CONFLICT(event_id, source_record_id) DO UPDATE SET
        role = excluded.role
    `),
    upsertEventEntity: database.prepare(`
      INSERT INTO event_entities (
        event_id,
        entity_id,
        role
      ) VALUES (
        :event_id,
        :entity_id,
        :role
      )
      ON CONFLICT(event_id, entity_id, role) DO NOTHING
    `),
    upsertConfidenceAssessment: database.prepare(`
      INSERT INTO confidence_assessments (
        id,
        target_type,
        target_id,
        assessment_level,
        overall_score,
        source_reliability_score,
        extraction_quality_score,
        corroboration_score,
        recency_score,
        assessed_by_type,
        assessed_by_id,
        rationale,
        created_at
      ) VALUES (
        :id,
        :target_type,
        :target_id,
        :assessment_level,
        :overall_score,
        :source_reliability_score,
        :extraction_quality_score,
        :corroboration_score,
        :recency_score,
        :assessed_by_type,
        :assessed_by_id,
        :rationale,
        :created_at
      )
      ON CONFLICT(id) DO UPDATE SET
        target_type = excluded.target_type,
        target_id = excluded.target_id,
        assessment_level = excluded.assessment_level,
        overall_score = excluded.overall_score,
        source_reliability_score = excluded.source_reliability_score,
        extraction_quality_score = excluded.extraction_quality_score,
        corroboration_score = excluded.corroboration_score,
        recency_score = excluded.recency_score,
        assessed_by_type = excluded.assessed_by_type,
        assessed_by_id = excluded.assessed_by_id,
        rationale = excluded.rationale,
        created_at = excluded.created_at
    `),
    markSourceRecordReady: database.prepare(`
      UPDATE source_records
      SET synthesis_status = 'ready'
      WHERE id = :id
    `),
    deleteEventSourceLinks: database.prepare(`
      DELETE FROM event_source_records
      WHERE event_id = :event_id
    `),
    deleteEventEntityLinks: database.prepare(`
      DELETE FROM event_entities
      WHERE event_id = :event_id
    `)
  };
}

function createCheck(id, ok, description) {
  return {
    id,
    ok,
    description
  };
}
