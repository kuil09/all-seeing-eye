const PENDING_REVIEW = "pending_review";

export function buildReviewQueueContext(timelineItems, selectedEventId) {
  if (!Array.isArray(timelineItems) || !selectedEventId) {
    return null;
  }

  const normalizedItems = timelineItems.filter(
    (item) => item && typeof item.eventId === "string" && item.eventId
  );
  if (normalizedItems.length === 0) {
    return null;
  }

  const visibleIndex = normalizedItems.findIndex((item) => item.eventId === selectedEventId);
  if (visibleIndex === -1) {
    return null;
  }

  const pendingItems = normalizedItems.filter((item) => item.reviewStatus === PENDING_REVIEW);
  const pendingIndex = pendingItems.findIndex((item) => item.eventId === selectedEventId);

  return {
    visibleCount: normalizedItems.length,
    visiblePosition: visibleIndex + 1,
    pendingCount: pendingItems.length,
    pendingPosition: pendingIndex === -1 ? null : pendingIndex + 1,
    remainingPendingAfterSelection:
      pendingIndex === -1 ? pendingItems.length : pendingItems.length - pendingIndex - 1
  };
}
