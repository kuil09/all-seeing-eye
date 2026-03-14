import {
  DEFAULT_TIMELINE_SORT,
  normalizeTimelineSort
} from "./timeline-sort.mjs";

export const MAX_RECENT_REVIEW_ACTIVITY = 6;

const DEFAULT_REOPEN_FILTERS = {
  searchQuery: "",
  reviewStatusFilter: "all",
  confidenceFilter: "all",
  historyFilter: "all",
  tagFilter: "all",
  draftFilter: "all",
  sortOrder: DEFAULT_TIMELINE_SORT
};

export function appendRecentReviewActivity(activity, entry) {
  const normalizedActivity = normalizeRecentReviewActivity(activity);
  const normalizedEntry = normalizeRecentReviewActivityEntry(entry);
  if (!normalizedEntry) {
    return normalizedActivity;
  }

  return [
    normalizedEntry,
    ...normalizedActivity.filter((existingEntry) => existingEntry.eventId !== normalizedEntry.eventId)
  ].slice(0, MAX_RECENT_REVIEW_ACTIVITY);
}

export function pruneRecentReviewActivity(activity, validEventIds) {
  const normalizedActivity = normalizeRecentReviewActivity(activity);
  if (!Array.isArray(validEventIds) || !validEventIds.length) {
    return [];
  }

  const validEventIdSet = new Set(validEventIds.map((eventId) => String(eventId)));
  return normalizedActivity.filter((entry) => validEventIdSet.has(entry.eventId));
}

export function readRecentReviewActivity(serializedActivity) {
  if (!serializedActivity) {
    return [];
  }

  try {
    const parsedActivity = JSON.parse(serializedActivity);
    return normalizeRecentReviewActivity(parsedActivity);
  } catch {
    return [];
  }
}

export function serializeRecentReviewActivity(activity) {
  return JSON.stringify(normalizeRecentReviewActivity(activity));
}

function normalizeRecentReviewActivity(activity) {
  if (!Array.isArray(activity) || !activity.length) {
    return [];
  }

  let normalizedActivity = [];
  for (let index = activity.length - 1; index >= 0; index -= 1) {
    normalizedActivity = appendRecentReviewActivity(normalizedActivity, activity[index]);
  }

  return normalizedActivity;
}

function normalizeRecentReviewActivityEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }

  const eventId = String(entry.eventId ?? "").trim();
  const headline = String(entry.headline ?? "").trim();
  const action = String(entry.action ?? "").trim();
  const reviewStatus = String(entry.reviewStatus ?? "").trim();
  const createdAt = normalizeIsoDate(entry.createdAt);

  if (!eventId || !headline || !action || !reviewStatus || !createdAt) {
    return null;
  }

  return {
    eventId,
    headline,
    action,
    reviewStatus,
    createdAt,
    notes: normalizeRecentReviewNotes(entry.notes),
    reopenFilters: normalizeReopenFilters(entry.reopenFilters)
  };
}

function normalizeIsoDate(value) {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) {
    return null;
  }

  const timestamp = Date.parse(normalizedValue);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function normalizeReopenFilters(reopenFilters) {
  if (!reopenFilters || typeof reopenFilters !== "object" || Array.isArray(reopenFilters)) {
    return { ...DEFAULT_REOPEN_FILTERS };
  }

  return {
    searchQuery: String(reopenFilters.searchQuery ?? DEFAULT_REOPEN_FILTERS.searchQuery).trim(),
    reviewStatusFilter: String(
      reopenFilters.reviewStatusFilter ?? DEFAULT_REOPEN_FILTERS.reviewStatusFilter
    ).trim() || DEFAULT_REOPEN_FILTERS.reviewStatusFilter,
    confidenceFilter: String(
      reopenFilters.confidenceFilter ?? DEFAULT_REOPEN_FILTERS.confidenceFilter
    ).trim() || DEFAULT_REOPEN_FILTERS.confidenceFilter,
    historyFilter: String(
      reopenFilters.historyFilter ?? DEFAULT_REOPEN_FILTERS.historyFilter
    ).trim() || DEFAULT_REOPEN_FILTERS.historyFilter,
    tagFilter:
      String(reopenFilters.tagFilter ?? DEFAULT_REOPEN_FILTERS.tagFilter).trim() ||
      DEFAULT_REOPEN_FILTERS.tagFilter,
    draftFilter:
      String(reopenFilters.draftFilter ?? DEFAULT_REOPEN_FILTERS.draftFilter).trim() ||
      DEFAULT_REOPEN_FILTERS.draftFilter,
    sortOrder: normalizeTimelineSort(reopenFilters.sortOrder)
  };
}

function normalizeRecentReviewNotes(notes) {
  if (typeof notes !== "string") {
    return "";
  }

  return notes.trim();
}
