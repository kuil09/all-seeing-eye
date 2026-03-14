import {
  deriveConfidenceLabel,
  mapContractPolarityToStorage,
  mapContractReviewStatusToStorage,
  mapFixtureEntityTypeToStorage,
  scoreFromConfidenceLabel
} from "../../packages/contracts/storage-mappings.mjs";
import { getEventLink } from "./bootstrap-manifest.mjs";

const DEFAULT_EXTRACTOR_VERSION = "bootstrap-deterministic/v1";

export function buildSynthesisBundle({
  dataset,
  captures,
  normalizedSourceRecords,
  now = new Date().toISOString(),
  extractorVersion = DEFAULT_EXTRACTOR_VERSION
}) {
  const captureBySourceRecordId = new Map(
    captures.map((capture) => [capture.sourceRecordId, capture])
  );
  const entityById = new Map(dataset.entities.map((entity) => [entity.id, entity]));
  const eventById = new Map(dataset.events.map((event) => [event.id, event]));
  const relationshipEventIds = buildRelationshipEventIndex(dataset.events);

  const entities = dataset.entities.map((entity) =>
    buildEntityRow({
      entity,
      now
    })
  );

  const events = dataset.events.map((event) =>
    buildEventRow({
      event,
      entityById,
      now
    })
  );

  const relationships = dataset.relationships.map((relationship) =>
    buildRelationshipRow({
      relationship,
      eventId: relationshipEventIds.get(relationship.id) ?? null,
      now
    })
  );

  const claims = dataset.claims.map((claim) =>
    buildClaimRow({
      claim,
      extractorVersion,
      now
    })
  );

  const eventSourceRecords = dataset.events.flatMap((event) =>
    buildEventSourceLinks(event.id).map((link) => ({
      event_id: event.id,
      source_record_id: link.sourceRecordId,
      role: link.role
    }))
  );

  const eventEntities = dataset.events.flatMap((event) =>
    buildEventEntityLinks(event.id).map((link) => ({
      event_id: event.id,
      entity_id: link.entityId,
      role: link.role
    }))
  );

  const confidenceAssessments = [
    ...buildSourceRecordAssessments({
      normalizedSourceRecords,
      captureBySourceRecordId,
      now,
      extractorVersion
    }),
    ...buildEventAssessments({
      dataset,
      now,
      extractorVersion
    }),
    ...buildClaimAssessments({
      dataset,
      eventById,
      now,
      extractorVersion
    }),
    ...buildRelationshipAssessments({
      dataset,
      now,
      extractorVersion
    })
  ];

  return {
    sourceRecords: normalizedSourceRecords,
    entities,
    events,
    relationships,
    claims,
    eventSourceRecords,
    eventEntities,
    confidenceAssessments
  };
}

function buildEventRow({ event, entityById, now }) {
  const link = getEventLink(event.id);
  const primaryLocation = link.primaryLocationEntityId
    ? entityById.get(link.primaryLocationEntityId)
    : null;
  const sourceRecordIds = Object.keys(link.sourceRoles);

  return {
    id: event.id,
    slug: buildSlug(event.id, event.headline),
    title: event.headline,
    summary_text: event.summary,
    event_type: link.eventType,
    status: "candidate",
    review_status: mapContractReviewStatusToStorage(event.reviewStatus),
    start_at: event.eventTime,
    end_at: null,
    timezone: "UTC",
    location_name: primaryLocation?.canonicalName ?? null,
    latitude: null,
    longitude: null,
    geography_precision: "none",
    first_source_record_id: sourceRecordIds[0] ?? null,
    analyst_notes: null,
    created_at: now,
    updated_at: now
  };
}

function buildEntityRow({ entity, now }) {
  return {
    id: entity.id,
    canonical_name: entity.canonicalName,
    normalized_name: normalizeName(entity.canonicalName),
    display_name: entity.canonicalName,
    entity_type: mapFixtureEntityTypeToStorage(entity.entityType),
    description: null,
    country_code: null,
    external_refs_json: "{}",
    first_observed_at: null,
    last_observed_at: null,
    merge_status: "active",
    created_at: now,
    updated_at: now
  };
}

function buildRelationshipRow({ relationship, eventId, now }) {
  return {
    id: relationship.id,
    subject_entity_id: relationship.sourceEntityId,
    predicate: relationship.relationshipType,
    object_entity_id: relationship.targetEntityId,
    event_id: eventId,
    directionality: "directed",
    status: "candidate",
    valid_from: null,
    valid_to: null,
    created_at: now,
    updated_at: now
  };
}

function buildClaimRow({ claim, extractorVersion, now }) {
  return {
    id: claim.id,
    source_record_id: resolveClaimSourceRecordId(claim.eventId),
    event_id: claim.eventId,
    subject_entity_id: null,
    object_entity_id: null,
    relationship_id: null,
    claim_type: "event_fact",
    predicate: claim.claimType,
    object_value_json: JSON.stringify(
      {
        text: claim.claimText,
        polarity: claim.polarity
      },
      null,
      2
    ),
    claim_text: claim.claimText,
    polarity: mapContractPolarityToStorage(claim.polarity),
    extraction_method: "rule",
    extractor_version: extractorVersion,
    evidence_span_start: null,
    evidence_span_end: null,
    created_at: now,
    updated_at: now
  };
}

function buildEventSourceLinks(eventId) {
  const link = getEventLink(eventId);

  return Object.entries(link.sourceRoles).map(([sourceRecordId, role]) => ({
    sourceRecordId,
    role
  }));
}

function buildEventEntityLinks(eventId) {
  const link = getEventLink(eventId);

  return Object.entries(link.entityRoles).map(([entityId, role]) => ({
    entityId,
    role
  }));
}

function buildRelationshipEventIndex(events) {
  const relationshipEventIds = new Map();

  for (const event of events) {
    const link = getEventLink(event.id);

    for (const relationshipId of link.relationshipIds) {
      relationshipEventIds.set(relationshipId, event.id);
    }
  }

  return relationshipEventIds;
}

function buildSourceRecordAssessments({
  normalizedSourceRecords,
  captureBySourceRecordId,
  now,
  extractorVersion
}) {
  return normalizedSourceRecords.map((sourceRecord) => {
    const capture = captureBySourceRecordId.get(sourceRecord.id);
    const sourceReliabilityScore = resolveFeedReliabilityScore(capture?.feedCategory);
    const extractionQualityScore = 0.78;
    const corroborationScore = 0.6;
    const recencyScore = 0.82;

    return {
      id: `conf_src_${sourceRecord.id}`,
      target_type: "source_record",
      target_id: sourceRecord.id,
      assessment_level: "current",
      overall_score: averageScores([
        sourceReliabilityScore,
        extractionQualityScore,
        corroborationScore,
        recencyScore
      ]),
      source_reliability_score: sourceReliabilityScore,
      extraction_quality_score: extractionQualityScore,
      corroboration_score: corroborationScore,
      recency_score: recencyScore,
      assessed_by_type: "rule",
      assessed_by_id: extractorVersion,
      rationale: `Curated ${capture?.feedCategory ?? "rss"} feed item normalized through the bootstrap fixture path.`,
      created_at: now
    };
  });
}

function buildEventAssessments({ dataset, now, extractorVersion }) {
  return dataset.confidenceAssessments
    .filter((assessment) => assessment.subjectType === "event")
    .map((assessment) => ({
      id: assessment.id,
      target_type: "event",
      target_id: assessment.subjectId,
      assessment_level: "current",
      overall_score: assessment.score,
      source_reliability_score: clampScore(assessment.score - 0.04),
      extraction_quality_score: clampScore(assessment.score - 0.02),
      corroboration_score: clampScore(assessment.score + 0.03),
      recency_score: 0.8,
      assessed_by_type: "rule",
      assessed_by_id: extractorVersion,
      rationale: assessment.rationale,
      created_at: now
    }));
}

function buildClaimAssessments({ dataset, now, extractorVersion }) {
  const eventConfidenceById = new Map(
    dataset.confidenceAssessments
      .filter((assessment) => assessment.subjectType === "event")
      .map((assessment) => [assessment.subjectId, assessment.score])
  );

  return dataset.claims.map((claim) => {
    const eventScore = eventConfidenceById.get(claim.eventId) ?? 0.65;
    const overallScore =
      claim.polarity === "uncertain" ? clampScore(eventScore - 0.14) : eventScore;

    return {
      id: `conf_claim_${claim.id}`,
      target_type: "claim",
      target_id: claim.id,
      assessment_level: "current",
      overall_score: overallScore,
      source_reliability_score: clampScore(eventScore - 0.05),
      extraction_quality_score: clampScore(eventScore - 0.03),
      corroboration_score: clampScore(
        claim.polarity === "uncertain" ? eventScore - 0.18 : eventScore
      ),
      recency_score: 0.8,
      assessed_by_type: "rule",
      assessed_by_id: extractorVersion,
      rationale: `Claim confidence derived from parent event evidence with ${claim.polarity} polarity.`,
      created_at: now
    };
  });
}

function buildRelationshipAssessments({ dataset, now, extractorVersion }) {
  return dataset.relationships.map((relationship) => {
    const score = scoreFromConfidenceLabel(relationship.confidence);

    return {
      id: `conf_rel_${relationship.id}`,
      target_type: "relationship",
      target_id: relationship.id,
      assessment_level: "current",
      overall_score: score,
      source_reliability_score: clampScore(score - 0.04),
      extraction_quality_score: clampScore(score - 0.02),
      corroboration_score: clampScore(score),
      recency_score: 0.75,
      assessed_by_type: "rule",
      assessed_by_id: extractorVersion,
      rationale: `${relationship.relationshipType} relationship confidence set to ${deriveConfidenceLabel(score)} from the bootstrap synthesis manifest.`,
      created_at: now
    };
  });
}

function resolveClaimSourceRecordId(eventId) {
  const link = getEventLink(eventId);
  const sourceRecordIds = Object.keys(link.sourceRoles);

  return sourceRecordIds[0] ?? null;
}

function resolveFeedReliabilityScore(feedCategory) {
  switch (feedCategory) {
    case "logistics":
      return 0.77;
    case "infrastructure":
      return 0.8;
    case "weather":
      return 0.69;
    default:
      return 0.7;
  }
}

function buildSlug(eventId, headline) {
  const headlineSlug = headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return headlineSlug || eventId.replace(/^evt_/, "");
}

function normalizeName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function averageScores(scores) {
  const sum = scores.reduce((total, score) => total + score, 0);
  return Number((sum / scores.length).toFixed(4));
}

function clampScore(score) {
  return Number(Math.max(0, Math.min(1, score)).toFixed(4));
}
