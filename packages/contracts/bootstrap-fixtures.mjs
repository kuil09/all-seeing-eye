const detailFixtureMap = {
  evt_20260314_harbor_north_inspections: {
    entityRoles: {
      ent_harbor_north: "location",
      ent_port_authority: "operator",
      ent_shipping_association: "observer"
    },
    entityIds: ["ent_harbor_north", "ent_port_authority", "ent_shipping_association"],
    relationshipIds: ["rel_harbor_operator", "rel_shipping_observer"],
    sourceIds: ["src_20260314_001", "src_20260314_002"]
  },
  evt_20260314_substation_outage: {
    entityRoles: {
      ent_substation_7: "location",
      ent_east_grid: "operator"
    },
    entityIds: ["ent_substation_7", "ent_east_grid"],
    relationshipIds: ["rel_grid_operator"],
    sourceIds: ["src_20260314_003", "src_20260314_004"]
  }
};

export function buildFixtureState(timelineResponse, exampleDetailResponse, bootstrapDataset) {
  const sortedTimeline = [...timelineResponse.items].sort((left, right) =>
    right.eventTime.localeCompare(left.eventTime)
  );
  const eventById = new Map(bootstrapDataset.events.map((event) => [event.id, event]));
  const claimsByEventId = groupBy(bootstrapDataset.claims, "eventId");
  const entityById = new Map(bootstrapDataset.entities.map((entity) => [entity.id, entity]));
  const relationshipById = new Map(
    bootstrapDataset.relationships.map((relationship) => [relationship.id, relationship])
  );
  const sourceById = new Map(
    bootstrapDataset.sourceRecords.map((sourceRecord) => [sourceRecord.id, sourceRecord])
  );
  const confidenceByEventId = new Map(
    bootstrapDataset.confidenceAssessments
      .filter((assessment) => assessment.subjectType === "event")
      .map((assessment) => [assessment.subjectId, assessment])
  );

  const details = {};

  for (const item of sortedTimeline) {
    const event = eventById.get(item.eventId);
    const mapping = detailFixtureMap[item.eventId];
    const confidence = confidenceByEventId.get(item.eventId);

    details[item.eventId] = {
      event: {
        id: item.eventId,
        headline: item.headline,
        summary: event?.summary ?? item.summary,
        eventTime: item.eventTime,
        reviewStatus: event?.reviewStatus ?? item.reviewStatus,
        confidence: {
          label: confidence?.label ?? item.confidence.label,
          score: confidence?.score ?? item.confidence.score,
          rationale:
            confidence?.rationale ?? "Confidence rationale is not available in the current fixture set."
        },
        primaryLocation: item.primaryLocation ?? null
      },
      claims: claimsByEventId.get(item.eventId) ?? [],
      entities: (mapping?.entityIds ?? [])
        .map((entityId) => entityById.get(entityId))
        .filter(Boolean)
        .map((entity) => ({
          ...entity,
          role: mapping.entityRoles[entity.id] ?? "related"
        })),
      relationships: (mapping?.relationshipIds ?? [])
        .map((relationshipId) => relationshipById.get(relationshipId))
        .filter(Boolean),
      sources: (mapping?.sourceIds ?? [])
        .map((sourceId) => sourceById.get(sourceId))
        .filter(Boolean)
        .map((sourceRecord) => ({
          id: sourceRecord.id,
          feedKey: sourceRecord.feedKey,
          title: sourceRecord.title,
          sourceUrl: sourceRecord.sourceUrl,
          publishedAt: sourceRecord.publishedAt,
          excerpt: sourceRecord.normalizedText
        })),
      reviewActions: []
    };
  }

  details[exampleDetailResponse.event.id] = {
    ...exampleDetailResponse,
    event: {
      ...exampleDetailResponse.event,
      reviewStatus:
        details[exampleDetailResponse.event.id]?.event.reviewStatus ??
        exampleDetailResponse.event.reviewStatus
    },
    reviewActions: exampleDetailResponse.reviewActions
  };

  return {
    generatedAt: timelineResponse.generatedAt,
    nextCursor: timelineResponse.nextCursor,
    timeline: sortedTimeline,
    details
  };
}

function groupBy(items, key) {
  const groups = new Map();
  for (const item of items) {
    const value = item[key];
    const existing = groups.get(value) ?? [];
    existing.push(item);
    groups.set(value, existing);
  }
  return groups;
}
