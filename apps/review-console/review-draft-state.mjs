const PREVIEW_MAX_LENGTH = 96;

export function getReviewDraft(reviewDrafts, eventId) {
  if (!eventId) {
    return "";
  }

  return reviewDrafts[eventId] ?? "";
}

export function setReviewDraft(reviewDrafts, eventId, nextDraft) {
  if (!eventId) {
    return reviewDrafts;
  }

  const currentDraft = getReviewDraft(reviewDrafts, eventId);
  if (currentDraft === nextDraft) {
    return reviewDrafts;
  }

  if (!normalizeReviewDraft(nextDraft)) {
    return clearReviewDraft(reviewDrafts, eventId);
  }

  return {
    ...reviewDrafts,
    [eventId]: nextDraft
  };
}

export function clearReviewDraft(reviewDrafts, eventId) {
  if (!eventId || !(eventId in reviewDrafts)) {
    return reviewDrafts;
  }

  const nextDrafts = { ...reviewDrafts };
  delete nextDrafts[eventId];
  return nextDrafts;
}

export function hasReviewDraft(reviewDrafts, eventId) {
  return Boolean(normalizeReviewDraft(getReviewDraft(reviewDrafts, eventId)));
}

export function pruneReviewDrafts(reviewDrafts, visibleEventIds) {
  const visibleEventIdSet = new Set(visibleEventIds);
  const nextDrafts = {};

  for (const [eventId, reviewDraft] of Object.entries(reviewDrafts)) {
    if (visibleEventIdSet.has(eventId) && normalizeReviewDraft(reviewDraft)) {
      nextDrafts[eventId] = reviewDraft;
    }
  }

  return nextDrafts;
}

export function buildReviewDraftPreview(reviewDraft) {
  const normalizedReviewDraft = normalizeReviewDraft(reviewDraft);
  if (!normalizedReviewDraft) {
    return null;
  }

  if (normalizedReviewDraft.length <= PREVIEW_MAX_LENGTH) {
    return normalizedReviewDraft;
  }

  return `${normalizedReviewDraft.slice(0, PREVIEW_MAX_LENGTH - 3).trimEnd()}...`;
}

function normalizeReviewDraft(reviewDraft) {
  if (typeof reviewDraft !== "string") {
    return "";
  }

  return reviewDraft.trim().replace(/\s+/g, " ");
}
