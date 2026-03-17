const PREVIEW_MAX_LENGTH = 96;
const MAX_STORED_DRAFTS = 48;

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

export function buildReviewDraftPreview(
  reviewDraft,
  { maxLength = PREVIEW_MAX_LENGTH } = {}
) {
  const normalizedReviewDraft = normalizeReviewDraft(reviewDraft);
  if (!normalizedReviewDraft) {
    return null;
  }

  const previewMaxLength =
    Number.isFinite(maxLength) && maxLength > 3
      ? Math.floor(maxLength)
      : PREVIEW_MAX_LENGTH;

  if (normalizedReviewDraft.length <= previewMaxLength) {
    return normalizedReviewDraft;
  }

  return `${normalizedReviewDraft.slice(0, previewMaxLength - 3).trimEnd()}...`;
}

export function readReviewDrafts(serializedReviewDrafts) {
  if (
    typeof serializedReviewDrafts !== "string" ||
    !serializedReviewDrafts.trim()
  ) {
    return {};
  }

  try {
    const parsed = JSON.parse(serializedReviewDrafts);
    return sanitizeStoredReviewDrafts(parsed);
  } catch {
    return {};
  }
}

export function serializeReviewDrafts(reviewDrafts) {
  return JSON.stringify(sanitizeStoredReviewDrafts(reviewDrafts));
}

function normalizeReviewDraft(reviewDraft) {
  if (typeof reviewDraft !== "string") {
    return "";
  }

  return reviewDraft.trim().replace(/\s+/g, " ");
}

function sanitizeStoredReviewDrafts(reviewDrafts) {
  if (!reviewDrafts || typeof reviewDrafts !== "object" || Array.isArray(reviewDrafts)) {
    return {};
  }

  const nextDrafts = {};

  for (const [eventId, reviewDraft] of Object.entries(reviewDrafts)) {
    if (
      typeof eventId !== "string" ||
      !eventId.trim() ||
      typeof reviewDraft !== "string" ||
      !normalizeReviewDraft(reviewDraft)
    ) {
      continue;
    }

    nextDrafts[eventId] = reviewDraft;

    if (Object.keys(nextDrafts).length >= MAX_STORED_DRAFTS) {
      break;
    }
  }

  return nextDrafts;
}
