import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  deriveConfidenceLabel,
  mapStoragePolarityToContract,
  mapStorageReviewStatusToContract
} from "../../packages/contracts/storage-mappings.mjs";
import { deriveTimelineTags } from "../../packages/contracts/timeline-tags.mjs";

export function shouldUseSqliteBackend() {
  return Boolean(process.env.READ_API_DB_PATH);
}

export async function getTimelineResponse(repoRoot) {
  return withDatabase(repoRoot, (database) => {
    const eventSourcePayloadsStatement = database.prepare(
      `
        SELECT
          s.raw_payload AS rawPayload
        FROM event_source_records es
        JOIN source_records s ON s.id = es.source_record_id
        WHERE es.event_id = :event_id
        ORDER BY
          CASE es.role
            WHEN 'trigger' THEN 0
            WHEN 'supporting' THEN 1
            ELSE 2
          END,
          s.published_at ASC
      `
    );
    const rows = database
      .prepare(
        `
          SELECT
            e.id AS eventId,
            e.title AS headline,
            e.summary_text AS summary,
            e.event_type AS eventType,
            COALESCE(e.start_at, e.created_at) AS eventTime,
            e.review_status AS reviewStatus,
            (
              SELECT ca.overall_score
              FROM confidence_assessments ca
              WHERE ca.target_type = 'event' AND ca.target_id = e.id
              ORDER BY
                CASE ca.assessment_level WHEN 'current' THEN 0 ELSE 1 END,
                ca.created_at DESC
              LIMIT 1
            ) AS confidenceScore,
            (
              SELECT COUNT(*)
              FROM event_source_records es
              WHERE es.event_id = e.id
            ) AS sourceCount,
            (
              SELECT COUNT(*)
              FROM claims c
              WHERE c.event_id = e.id
            ) AS claimCount,
            (
              SELECT COUNT(*)
              FROM event_entities ee
              WHERE ee.event_id = e.id
            ) AS entityCount,
            COALESCE(
              (
                SELECT en.display_name
                FROM event_entities ee
                JOIN entities en ON en.id = ee.entity_id
                WHERE ee.event_id = e.id AND ee.role = 'location'
                ORDER BY en.display_name
                LIMIT 1
              ),
              e.location_name
            ) AS primaryLocation
          FROM events e
          ORDER BY eventTime DESC, e.id DESC
        `
      )
      .all();

    return {
      generatedAt: new Date().toISOString(),
      nextCursor: null,
      items: rows.map((row) => {
        const feedCategories = extractFeedCategories(
          eventSourcePayloadsStatement.all({ event_id: row.eventId })
        );

        return {
          eventId: row.eventId,
          headline: row.headline,
          summary: row.summary,
          eventTime: row.eventTime,
          reviewStatus: mapStorageReviewStatusToContract(row.reviewStatus),
          confidence: {
            label: deriveConfidenceLabel(row.confidenceScore ?? 0.5),
            score: row.confidenceScore ?? 0.5
          },
          sourceCount: row.sourceCount,
          claimCount: row.claimCount,
          entityCount: row.entityCount,
          primaryLocation: row.primaryLocation ?? null,
          tags: deriveTimelineTags({
            feedCategories,
            eventType: row.eventType
          })
        };
      })
    };
  });
}

export async function getEventDetail(repoRoot, eventId) {
  return withDatabase(repoRoot, (database) => {
    const eventRow = database
      .prepare(
        `
          SELECT
            e.id,
            e.title AS headline,
            e.summary_text AS summary,
            COALESCE(e.start_at, e.created_at) AS eventTime,
            e.review_status AS reviewStatus,
            COALESCE(
              (
                SELECT en.display_name
                FROM event_entities ee
                JOIN entities en ON en.id = ee.entity_id
                WHERE ee.event_id = e.id AND ee.role = 'location'
                ORDER BY en.display_name
                LIMIT 1
              ),
              e.location_name
            ) AS primaryLocation,
            (
              SELECT ca.overall_score
              FROM confidence_assessments ca
              WHERE ca.target_type = 'event' AND ca.target_id = e.id
              ORDER BY
                CASE ca.assessment_level WHEN 'current' THEN 0 ELSE 1 END,
                ca.created_at DESC
              LIMIT 1
            ) AS confidenceScore,
            (
              SELECT ca.rationale
              FROM confidence_assessments ca
              WHERE ca.target_type = 'event' AND ca.target_id = e.id
              ORDER BY
                CASE ca.assessment_level WHEN 'current' THEN 0 ELSE 1 END,
                ca.created_at DESC
              LIMIT 1
            ) AS confidenceRationale
          FROM events e
          WHERE e.id = :event_id
        `
      )
      .get({ event_id: eventId });

    if (!eventRow) {
      return null;
    }

    const claims = database
      .prepare(
        `
          SELECT
            id,
            predicate AS claimType,
            claim_text AS claimText,
            polarity
          FROM claims
          WHERE event_id = :event_id
          ORDER BY created_at ASC, id ASC
        `
      )
      .all({ event_id: eventId })
      .map((row) => ({
        id: row.id,
        claimType: row.claimType,
        claimText: row.claimText,
        polarity: mapStoragePolarityToContract(row.polarity)
      }));

    const entities = database
      .prepare(
        `
          SELECT
            en.id,
            en.display_name AS canonicalName,
            en.entity_type AS entityType,
            ee.role
          FROM event_entities ee
          JOIN entities en ON en.id = ee.entity_id
          WHERE ee.event_id = :event_id
          ORDER BY ee.role ASC, en.display_name ASC
        `
      )
      .all({ event_id: eventId })
      .map((row) => ({
        id: row.id,
        canonicalName: row.canonicalName,
        entityType: row.entityType === "place" && row.role === "location" ? "facility" : row.entityType,
        role: row.role
      }));

    const relationships = database
      .prepare(
        `
          SELECT
            r.id,
            r.subject_entity_id AS sourceEntityId,
            r.object_entity_id AS targetEntityId,
            r.predicate AS relationshipType,
            (
              SELECT ca.overall_score
              FROM confidence_assessments ca
              WHERE ca.target_type = 'relationship' AND ca.target_id = r.id
              ORDER BY
                CASE ca.assessment_level WHEN 'current' THEN 0 ELSE 1 END,
                ca.created_at DESC
              LIMIT 1
            ) AS confidenceScore
          FROM relationships r
          WHERE r.event_id = :event_id
          ORDER BY r.id ASC
        `
      )
      .all({ event_id: eventId })
      .map((row) => ({
        id: row.id,
        sourceEntityId: row.sourceEntityId,
        targetEntityId: row.targetEntityId,
        relationshipType: row.relationshipType,
        confidence: deriveConfidenceLabel(row.confidenceScore ?? 0.5)
      }));

    const sources = database
      .prepare(
        `
          SELECT
            s.id,
            s.source_key AS feedKey,
            s.title,
            s.canonical_url AS sourceUrl,
            s.published_at AS publishedAt,
            s.body_text AS excerpt
          FROM event_source_records es
          JOIN source_records s ON s.id = es.source_record_id
          WHERE es.event_id = :event_id
          ORDER BY
            CASE es.role
              WHEN 'trigger' THEN 0
              WHEN 'supporting' THEN 1
              ELSE 2
            END,
            s.published_at ASC
        `
      )
      .all({ event_id: eventId });

    return {
      event: {
        id: eventRow.id,
        headline: eventRow.headline,
        summary: eventRow.summary,
        eventTime: eventRow.eventTime,
        reviewStatus: mapStorageReviewStatusToContract(eventRow.reviewStatus),
        confidence: {
          label: deriveConfidenceLabel(eventRow.confidenceScore ?? 0.5),
          score: eventRow.confidenceScore ?? 0.5,
          rationale:
            eventRow.confidenceRationale ??
            "Confidence rationale is not available in the current SQLite state."
        },
        primaryLocation: eventRow.primaryLocation ?? null
      },
      claims,
      entities,
      relationships,
      sources,
      reviewActions: []
    };
  });
}

function withDatabase(repoRoot, callback) {
  const dbPath = resolveDatabasePath(repoRoot);
  const database = new DatabaseSync(dbPath);
  database.exec("PRAGMA foreign_keys = ON;");

  try {
    return callback(database);
  } finally {
    database.close();
  }
}

function extractFeedCategories(sourceRows) {
  const categories = [];

  for (const row of sourceRows) {
    if (typeof row.rawPayload !== "string" || !row.rawPayload.trim()) {
      continue;
    }

    try {
      const payload = JSON.parse(row.rawPayload);
      const category = payload?.feed?.category;
      if (typeof category === "string" && category.trim()) {
        categories.push(category);
      }
    } catch {
      continue;
    }
  }

  return categories;
}

function resolveDatabasePath(repoRoot) {
  const dbPath = process.env.READ_API_DB_PATH;

  if (!dbPath) {
    throw new Error("READ_API_DB_PATH must be set to use the SQLite read backend.");
  }

  const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.join(repoRoot, dbPath);

  if (!existsSync(resolvedDbPath)) {
    throw new Error(`SQLite database not found at ${resolvedDbPath}.`);
  }

  return resolvedDbPath;
}
