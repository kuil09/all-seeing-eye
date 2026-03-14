export function matchesTimelineSearchQuery(query, timelineItem, detail) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return true;
  }

  return buildTimelineSearchText(timelineItem, detail).includes(normalizedQuery);
}

export function buildTimelineSearchText(timelineItem, detail) {
  return normalizeSearchValue(
    [
      timelineItem?.headline,
      timelineItem?.summary,
      timelineItem?.primaryLocation,
      timelineItem?.reviewStatus,
      timelineItem?.confidence?.label,
      ...(timelineItem?.tags ?? []),
      detail?.event?.headline,
      detail?.event?.summary,
      detail?.event?.primaryLocation,
      detail?.event?.reviewStatus,
      detail?.event?.confidence?.label,
      ...(detail?.claims ?? []).flatMap((claim) => [
        claim?.claimType,
        claim?.claimText,
        claim?.polarity
      ]),
      ...(detail?.entities ?? []).flatMap((entity) => [
        entity?.canonicalName,
        entity?.entityType,
        entity?.role
      ]),
      ...(detail?.relationships ?? []).flatMap((relationship) => [
        relationship?.relationshipType,
        relationship?.confidence
      ]),
      ...(detail?.sources ?? []).flatMap((source) => [
        source?.title,
        source?.feedKey,
        source?.excerpt,
        source?.sourceUrl
      ]),
      ...(detail?.reviewActions ?? []).flatMap((reviewAction) => [
        reviewAction?.actorName,
        reviewAction?.action,
        reviewAction?.notes
      ])
    ].join(" ")
  );
}

function normalizeSearchValue(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
