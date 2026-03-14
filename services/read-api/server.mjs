import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serviceRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(serviceRoot, "../..");
const datasetPath = resolve(repoRoot, "fixtures/bootstrap-dataset.json");

const dataset = JSON.parse(readFileSync(datasetPath, "utf8"));
const feedsByKey = new Map(dataset.feeds.map((feed) => [feed.feedKey, feed]));
const eventsById = new Map(dataset.events.map((event) => [event.id, event]));
const confidenceBySubjectId = new Map(
  dataset.confidenceAssessments
    .filter((assessment) => assessment.subjectType === "event")
    .map((assessment) => [assessment.subjectId, assessment]),
);

const eventEntityRoles = {
  evt_20260314_harbor_north_inspections: {
    ent_harbor_north: "location",
    ent_port_authority: "operator",
    ent_shipping_association: "observer",
  },
  evt_20260314_substation_outage: {
    ent_substation_7: "location",
    ent_east_grid: "operator",
  },
};

const eventSourceIds = {
  evt_20260314_harbor_north_inspections: [
    "src_20260314_001",
    "src_20260314_002",
  ],
  evt_20260314_substation_outage: [
    "src_20260314_003",
    "src_20260314_004",
  ],
};

function getConfidence(eventId) {
  const assessment = confidenceBySubjectId.get(eventId);
  return {
    label: assessment?.label ?? "medium",
    score: assessment?.score ?? 0.5,
    rationale:
      assessment?.rationale ??
      "Fixture-backed confidence for the shared contract baseline.",
  };
}

function getEntities(eventId) {
  const roleMap = eventEntityRoles[eventId] ?? {};
  return dataset.entities
    .filter((entity) => roleMap[entity.id])
    .map((entity) => ({
      id: entity.id,
      canonicalName: entity.canonicalName,
      entityType: entity.entityType,
      role: roleMap[entity.id],
    }));
}

function getRelationships(eventId) {
  const entityIds = new Set(getEntities(eventId).map((entity) => entity.id));
  return dataset.relationships
    .filter(
      (relationship) =>
        entityIds.has(relationship.sourceEntityId) &&
        entityIds.has(relationship.targetEntityId),
    )
    .map((relationship) => ({
      id: relationship.id,
      sourceEntityId: relationship.sourceEntityId,
      targetEntityId: relationship.targetEntityId,
      relationshipType: relationship.relationshipType,
      confidence: relationship.confidence,
    }));
}

function getSources(eventId) {
  const sourceIds = new Set(eventSourceIds[eventId] ?? []);
  return dataset.sourceRecords
    .filter((source) => sourceIds.has(source.id))
    .map((source) => ({
      id: source.id,
      feedKey: source.feedKey,
      title: source.title,
      sourceUrl: source.sourceUrl,
      publishedAt: source.publishedAt,
      excerpt: source.normalizedText,
    }));
}

function getTags(eventId) {
  const categories = new Set(
    getSources(eventId)
      .map((source) => feedsByKey.get(source.feedKey)?.category)
      .filter(Boolean),
  );
  return [...categories];
}

function getPrimaryLocation(eventId) {
  return (
    getEntities(eventId).find((entity) => entity.role === "location")
      ?.canonicalName ?? null
  );
}

function buildTimelineItem(event) {
  const claims = dataset.claims.filter((claim) => claim.eventId === event.id);
  const entities = getEntities(event.id);
  const sources = getSources(event.id);
  const confidence = getConfidence(event.id);

  return {
    eventId: event.id,
    headline: event.headline,
    summary: event.summary,
    eventTime: event.eventTime,
    reviewStatus: event.reviewStatus,
    confidence: {
      label: confidence.label,
      score: confidence.score,
    },
    sourceCount: sources.length,
    claimCount: claims.length,
    entityCount: entities.length,
    primaryLocation: getPrimaryLocation(event.id),
    tags: getTags(event.id),
  };
}

function buildTimelineResponse() {
  const items = [...dataset.events]
    .sort((left, right) => right.eventTime.localeCompare(left.eventTime))
    .map(buildTimelineItem);

  return {
    generatedAt: new Date().toISOString(),
    nextCursor: null,
    items,
  };
}

function buildEventDetail(eventId) {
  const event = eventsById.get(eventId);

  if (!event) {
    return null;
  }

  const confidence = getConfidence(eventId);

  return {
    event: {
      id: event.id,
      headline: event.headline,
      summary: event.summary,
      eventTime: event.eventTime,
      reviewStatus: event.reviewStatus,
      confidence: {
        label: confidence.label,
        score: confidence.score,
        rationale: confidence.rationale,
      },
      primaryLocation: getPrimaryLocation(eventId),
    },
    claims: dataset.claims
      .filter((claim) => claim.eventId === eventId)
      .map((claim) => ({
        id: claim.id,
        claimType: claim.claimType,
        claimText: claim.claimText,
        polarity: claim.polarity,
      })),
    entities: getEntities(eventId),
    relationships: getRelationships(eventId),
    sources: getSources(eventId),
    reviewActions: [
      {
        id: `rev_${eventId}_bootstrap`,
        action: "edit",
        actorType: "system",
        actorName: "bootstrap-fixture",
        createdAt: event.eventTime,
        notes:
          "Fixture-backed event detail published for review-console integration.",
      },
    ],
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

const port = Number(process.env.PORT ?? "4310");
const host = process.env.HOST ?? "127.0.0.1";

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? host}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    });
    response.end();
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, {
      error: "Method not allowed",
      allowedMethods: ["GET", "OPTIONS"],
    });
    return;
  }

  if (url.pathname === "/healthz") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (url.pathname === "/api/timeline") {
    sendJson(response, 200, buildTimelineResponse());
    return;
  }

  const eventMatch = url.pathname.match(/^\/api\/events\/([^/]+)$/);
  if (eventMatch) {
    const eventDetail = buildEventDetail(decodeURIComponent(eventMatch[1]));

    if (!eventDetail) {
      sendJson(response, 404, { error: "Event not found" });
      return;
    }

    sendJson(response, 200, eventDetail);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(port, host, () => {
  console.log(`read-api listening on http://${host}:${port}`);
});
