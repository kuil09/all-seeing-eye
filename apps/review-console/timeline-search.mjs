const SEARCH_MATCH_PREVIEW_LIMIT = 96;

export function matchesTimelineSearchQuery(query, timelineItem, detail) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return true;
  }

  return buildTimelineSearchMatches(query, timelineItem, detail).length > 0;
}

export function buildTimelineSearchMatches(query, timelineItem, detail) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return [];
  }

  return buildTimelineSearchSections(timelineItem, detail).flatMap((section) => {
    const matchingValue = section.values.find((value) =>
      normalizeSearchValue(value).includes(normalizedQuery)
    );

    return matchingValue
      ? [
          {
            label: section.label,
            preview: formatMatchPreview(matchingValue)
          }
        ]
      : [];
  });
}

export function buildTimelineSearchText(timelineItem, detail) {
  return normalizeSearchValue(
    buildTimelineSearchSections(timelineItem, detail)
      .flatMap((section) => section.values)
      .join(" ")
  );
}

function buildTimelineSearchSections(timelineItem, detail) {
  return [
    {
      label: "Event",
      values: collectSectionValues([
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
        detail?.event?.confidence?.label
      ])
    },
    {
      label: "Claim",
      values: collectSectionValues(
        (detail?.claims ?? []).flatMap((claim) => [
          claim?.claimType,
          claim?.claimText,
          claim?.polarity
        ])
      )
    },
    {
      label: "Participant",
      values: collectSectionValues(
        (detail?.entities ?? []).flatMap((entity) => [
          entity?.canonicalName,
          entity?.entityType,
          entity?.role
        ])
      )
    },
    {
      label: "Relationship",
      values: collectSectionValues(
        (detail?.relationships ?? []).flatMap((relationship) => [
          relationship?.relationshipType,
          relationship?.confidence
        ])
      )
    },
    {
      label: "Source",
      values: collectSectionValues(
        (detail?.sources ?? []).flatMap((source) => [
          source?.title,
          source?.feedKey,
          source?.excerpt,
          source?.sourceUrl
        ])
      )
    },
    {
      label: "Review history",
      values: collectSectionValues(
        (detail?.reviewActions ?? []).flatMap((reviewAction) => [
          reviewAction?.actorName,
          reviewAction?.action,
          reviewAction?.notes
        ])
      )
    }
  ];
}

function collectSectionValues(values) {
  const seenValues = new Set();
  const normalizedValues = [];

  for (const value of values) {
    const normalizedValue = normalizeSearchValue(value);
    if (!normalizedValue || seenValues.has(normalizedValue)) {
      continue;
    }

    seenValues.add(normalizedValue);
    normalizedValues.push(String(value).trim().replace(/\s+/g, " "));
  }

  return normalizedValues;
}

function formatMatchPreview(value) {
  const normalizedValue = String(value).trim().replace(/\s+/g, " ");
  if (normalizedValue.length <= SEARCH_MATCH_PREVIEW_LIMIT) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, SEARCH_MATCH_PREVIEW_LIMIT - 3)}...`;
}

function normalizeSearchValue(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
