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
      ensureSupplementalSchema(this.database);
      if (!this.statements) {
        this.statements = createStatements(this.database);
      }
      return;
    }

    const schemaPath = path.join(this.repoRoot, "schemas/all-seeing-eye-v1.sql");
    const schemaSql = readFileSync(schemaPath, "utf8");
    this.database.exec(schemaSql);
    ensureSupplementalSchema(this.database);
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

  recordIngestRunStarted({ ingestRunId, mode, startedAt, datasetPath = null, allowlistPath = null }) {
    const recordedAt = startedAt ?? new Date().toISOString();
    this.statements.upsertIngestRun.run({
      id: ingestRunId,
      mode,
      status: "running",
      started_at: recordedAt,
      completed_at: null,
      dataset_path: datasetPath,
      allowlist_path: allowlistPath,
      feed_count: 0,
      succeeded_feed_count: 0,
      failed_feed_count: 0,
      item_count: 0,
      persisted_source_record_count: 0,
      error_message: null,
      created_at: recordedAt,
      updated_at: recordedAt
    });
  }

  recordIngestRunCompleted({
    ingestRunId,
    status,
    completedAt,
    datasetPath = null,
    allowlistPath = null,
    feedCount = 0,
    succeededFeedCount = 0,
    failedFeedCount = 0,
    itemCount = 0,
    persistedSourceRecordCount = 0,
    errorMessage = null
  }) {
    const recordedAt = completedAt ?? new Date().toISOString();

    this.statements.updateIngestRun.run({
      id: ingestRunId,
      status,
      completed_at: recordedAt,
      dataset_path: datasetPath,
      allowlist_path: allowlistPath,
      feed_count: feedCount,
      succeeded_feed_count: succeededFeedCount,
      failed_feed_count: failedFeedCount,
      item_count: itemCount,
      persisted_source_record_count: persistedSourceRecordCount,
      error_message: errorMessage,
      updated_at: recordedAt
    });
  }

  replaceIngestRunFeeds({ ingestRunId, feeds, recordedAt }) {
    this.statements.deleteIngestRunFeeds.run({ ingest_run_id: ingestRunId });

    for (const feed of feeds) {
      this.statements.upsertIngestRunFeed.run({
        ingest_run_id: ingestRunId,
        feed_key: feed.feedKey,
        feed_url: feed.feedUrl,
        feed_category: feed.feedCategory,
        status: feed.status,
        attempt_count: feed.attemptCount,
        item_count: feed.itemCount,
        latest_published_at: feed.latestPublishedAt,
        error_message: feed.errorMessage,
        last_http_status: feed.lastHttpStatus,
        response_content_type: feed.responseContentType,
        fetched_at: feed.fetchedAt ?? recordedAt ?? null,
        created_at: recordedAt,
        updated_at: recordedAt
      });
    }
  }

  getIngestRunHistory(limit = 10) {
    const parsedLimit = Math.max(1, Number(limit) || 10);
    const recentRuns = this.database
      .prepare(
        `
          SELECT
            id,
            mode,
            status,
            started_at,
            completed_at,
            dataset_path,
            allowlist_path,
            feed_count,
            succeeded_feed_count,
            failed_feed_count,
            item_count,
            persisted_source_record_count,
            error_message
          FROM ingest_runs
          ORDER BY started_at DESC, id DESC
          LIMIT :limit
        `
      )
      .all({ limit: parsedLimit })
      .map((run) => mapIngestRunRow(run));

    const runIds = recentRuns.map((run) => run.ingestRunId);
    const feedsByRunId = new Map();

    if (runIds.length > 0) {
      const placeholders = runIds.map((_, index) => `:run_${index}`).join(", ");
      const params = Object.fromEntries(runIds.map((runId, index) => [`run_${index}`, runId]));
      const feedRows = this.database
        .prepare(
          `
            SELECT
              ingest_run_id,
              feed_key,
              feed_url,
              feed_category,
              status,
              attempt_count,
              item_count,
              latest_published_at,
              error_message,
              last_http_status,
              response_content_type,
              fetched_at
            FROM ingest_run_feeds
            WHERE ingest_run_id IN (${placeholders})
            ORDER BY ingest_run_id DESC, status ASC, feed_key ASC
          `
        )
        .all(params);

      for (const row of feedRows) {
        const feeds = feedsByRunId.get(row.ingest_run_id) ?? [];
        feeds.push(mapIngestRunFeedRow(row));
        feedsByRunId.set(row.ingest_run_id, feeds);
      }
    }

    return {
      lastSuccessfulRun: this.getLatestIngestRunByStatuses(["succeeded"]),
      lastFailedRun: this.getLatestIngestRunByStatuses(["failed", "partial_failure"]),
      recentRuns: recentRuns.map((run) => ({
        ...run,
        feeds: feedsByRunId.get(run.ingestRunId) ?? []
      }))
    };
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

  getLatestIngestRunByStatuses(statuses) {
    if (!Array.isArray(statuses) || statuses.length === 0) {
      return null;
    }

    const placeholders = statuses.map((_, index) => `:status_${index}`).join(", ");
    const params = Object.fromEntries(statuses.map((status, index) => [`status_${index}`, status]));
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            mode,
            status,
            started_at,
            completed_at,
            dataset_path,
            allowlist_path,
            feed_count,
            succeeded_feed_count,
            failed_feed_count,
            item_count,
            persisted_source_record_count,
            error_message
          FROM ingest_runs
          WHERE status IN (${placeholders})
          ORDER BY started_at DESC, id DESC
          LIMIT 1
        `
      )
      .get(params);

    return row ? mapIngestRunRow(row) : null;
  }
}

function createStatements(database) {
  return {
    upsertIngestRun: database.prepare(`
      INSERT INTO ingest_runs (
        id,
        mode,
        status,
        started_at,
        completed_at,
        dataset_path,
        allowlist_path,
        feed_count,
        succeeded_feed_count,
        failed_feed_count,
        item_count,
        persisted_source_record_count,
        error_message,
        created_at,
        updated_at
      ) VALUES (
        :id,
        :mode,
        :status,
        :started_at,
        :completed_at,
        :dataset_path,
        :allowlist_path,
        :feed_count,
        :succeeded_feed_count,
        :failed_feed_count,
        :item_count,
        :persisted_source_record_count,
        :error_message,
        :created_at,
        :updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        mode = excluded.mode,
        status = excluded.status,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        dataset_path = excluded.dataset_path,
        allowlist_path = excluded.allowlist_path,
        feed_count = excluded.feed_count,
        succeeded_feed_count = excluded.succeeded_feed_count,
        failed_feed_count = excluded.failed_feed_count,
        item_count = excluded.item_count,
        persisted_source_record_count = excluded.persisted_source_record_count,
        error_message = excluded.error_message,
        updated_at = excluded.updated_at
    `),
    updateIngestRun: database.prepare(`
      UPDATE ingest_runs
      SET
        status = :status,
        completed_at = :completed_at,
        dataset_path = COALESCE(:dataset_path, dataset_path),
        allowlist_path = COALESCE(:allowlist_path, allowlist_path),
        feed_count = :feed_count,
        succeeded_feed_count = :succeeded_feed_count,
        failed_feed_count = :failed_feed_count,
        item_count = :item_count,
        persisted_source_record_count = :persisted_source_record_count,
        error_message = :error_message,
        updated_at = :updated_at
      WHERE id = :id
    `),
    upsertIngestRunFeed: database.prepare(`
      INSERT INTO ingest_run_feeds (
        ingest_run_id,
        feed_key,
        feed_url,
        feed_category,
        status,
        attempt_count,
        item_count,
        latest_published_at,
        error_message,
        last_http_status,
        response_content_type,
        fetched_at,
        created_at,
        updated_at
      ) VALUES (
        :ingest_run_id,
        :feed_key,
        :feed_url,
        :feed_category,
        :status,
        :attempt_count,
        :item_count,
        :latest_published_at,
        :error_message,
        :last_http_status,
        :response_content_type,
        :fetched_at,
        :created_at,
        :updated_at
      )
      ON CONFLICT(ingest_run_id, feed_key) DO UPDATE SET
        feed_url = excluded.feed_url,
        feed_category = excluded.feed_category,
        status = excluded.status,
        attempt_count = excluded.attempt_count,
        item_count = excluded.item_count,
        latest_published_at = excluded.latest_published_at,
        error_message = excluded.error_message,
        last_http_status = excluded.last_http_status,
        response_content_type = excluded.response_content_type,
        fetched_at = excluded.fetched_at,
        updated_at = excluded.updated_at
    `),
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
    `),
    deleteIngestRunFeeds: database.prepare(`
      DELETE FROM ingest_run_feeds
      WHERE ingest_run_id = :ingest_run_id
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

function ensureSupplementalSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS ingest_runs (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL CHECK (mode IN ('fixture_seed', 'live_poll')),
      status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'partial_failure', 'failed')),
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

    CREATE INDEX IF NOT EXISTS idx_ingest_runs_started_at
      ON ingest_runs (started_at DESC);

    CREATE INDEX IF NOT EXISTS idx_ingest_runs_status
      ON ingest_runs (status, started_at DESC);

    CREATE TABLE IF NOT EXISTS ingest_run_feeds (
      ingest_run_id TEXT NOT NULL,
      feed_key TEXT NOT NULL,
      feed_url TEXT NOT NULL,
      feed_category TEXT,
      status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed')),
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

    CREATE INDEX IF NOT EXISTS idx_ingest_run_feeds_status
      ON ingest_run_feeds (status);
  `);
}

function mapIngestRunRow(row) {
  return {
    ingestRunId: row.id,
    mode: row.mode,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    datasetPath: row.dataset_path,
    allowlistPath: row.allowlist_path,
    feedCount: row.feed_count,
    succeededFeedCount: row.succeeded_feed_count,
    failedFeedCount: row.failed_feed_count,
    itemCount: row.item_count,
    persistedSourceRecordCount: row.persisted_source_record_count,
    errorMessage: row.error_message
  };
}

function mapIngestRunFeedRow(row) {
  return {
    feedKey: row.feed_key,
    feedUrl: row.feed_url,
    feedCategory: row.feed_category,
    status: row.status,
    attemptCount: row.attempt_count,
    itemCount: row.item_count,
    latestPublishedAt: row.latest_published_at,
    errorMessage: row.error_message,
    lastHttpStatus: row.last_http_status,
    responseContentType: row.response_content_type,
    fetchedAt: row.fetched_at
  };
}
