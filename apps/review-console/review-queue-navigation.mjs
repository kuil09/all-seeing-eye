const PENDING_REVIEW = "pending_review";

export function resolveNextPendingEventId(timelineItems, currentEventId) {
  const normalizedItems = normalizeTimelineItems(timelineItems);
  if (normalizedItems.length === 0) {
    return null;
  }

  const currentIndex = normalizedItems.findIndex((item) => item.eventId === currentEventId);
  if (currentIndex === -1) {
    return normalizedItems.find((item) => item.reviewStatus === PENDING_REVIEW)?.eventId ?? null;
  }

  for (let offset = 1; offset < normalizedItems.length; offset += 1) {
    const candidate = normalizedItems[(currentIndex + offset) % normalizedItems.length];
    if (candidate.reviewStatus === PENDING_REVIEW) {
      return candidate.eventId;
    }
  }

  return null;
}

export function buildReviewQueueNavigation(timelineItems, currentEventId) {
  const normalizedItems = normalizeTimelineItems(timelineItems);
  if (normalizedItems.length === 0) {
    return null;
  }

  const currentIndex = normalizedItems.findIndex((item) => item.eventId === currentEventId);
  if (currentIndex === -1) {
    return null;
  }

  return {
    previousVisibleEventId:
      normalizedItems.length === 1
        ? null
        : normalizedItems[(currentIndex - 1 + normalizedItems.length) % normalizedItems.length]
            .eventId,
    nextVisibleEventId:
      normalizedItems.length === 1
        ? null
        : normalizedItems[(currentIndex + 1) % normalizedItems.length].eventId,
    nextPendingEventId: resolveNextPendingEventId(normalizedItems, currentEventId)
  };
}

function normalizeTimelineItems(timelineItems) {
  if (!Array.isArray(timelineItems) || timelineItems.length === 0) {
    return [];
  }

  return timelineItems.filter(
    (item) => item && typeof item.eventId === "string" && item.eventId
  );
}
