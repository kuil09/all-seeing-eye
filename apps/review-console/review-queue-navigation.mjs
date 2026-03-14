const PENDING_REVIEW = "pending_review";

export function resolveNextPendingEventId(timelineItems, currentEventId) {
  if (!Array.isArray(timelineItems) || timelineItems.length === 0) {
    return null;
  }

  const normalizedItems = timelineItems.filter(
    (item) => item && typeof item.eventId === "string" && item.eventId
  );
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
