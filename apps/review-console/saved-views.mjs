import {
  DRAFT_FILTER_ALL,
  DRAFT_FILTER_SAVED,
  HISTORY_FILTER_ALL,
  HISTORY_FILTER_REVIEWED,
  HISTORY_FILTER_UNREVIEWED
} from "./view-state.mjs";
import {
  DEFAULT_TIMELINE_SORT,
  normalizeTimelineSort
} from "./timeline-sort.mjs";

const MAX_SAVED_VIEWS = 8;
const MAX_LABEL_LENGTH = 40;
const REVIEW_STATUS_FILTERS = new Set([
  "all",
  "pending_review",
  "approved",
  "edited",
  "rejected"
]);
const CONFIDENCE_FILTERS = new Set(["all", "high", "medium", "low"]);
const DRAFT_FILTERS = new Set([DRAFT_FILTER_ALL, DRAFT_FILTER_SAVED]);
const HISTORY_FILTERS = new Set([
  HISTORY_FILTER_ALL,
  HISTORY_FILTER_REVIEWED,
  HISTORY_FILTER_UNREVIEWED
]);

function normalizeWhitespace(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

function readEnum(value, allowedValues, fallback) {
  return value && allowedValues.has(value) ? value : fallback;
}

export function normalizeSavedViewLabel(label) {
  return normalizeWhitespace(label).slice(0, MAX_LABEL_LENGTH);
}

export function buildSavedViewId(label) {
  return normalizeSavedViewLabel(label).toLowerCase();
}

export function createSavedViewFilters(filters = {}) {
  return {
    searchQuery: normalizeWhitespace(filters.searchQuery).toLowerCase(),
    reviewStatusFilter: readEnum(filters.reviewStatusFilter, REVIEW_STATUS_FILTERS, "all"),
    confidenceFilter: readEnum(filters.confidenceFilter, CONFIDENCE_FILTERS, "all"),
    historyFilter: readEnum(filters.historyFilter, HISTORY_FILTERS, HISTORY_FILTER_ALL),
    tagFilter: normalizeWhitespace(filters.tagFilter) || "all",
    draftFilter: readEnum(filters.draftFilter, DRAFT_FILTERS, DRAFT_FILTER_ALL),
    sortOrder: normalizeTimelineSort(filters.sortOrder ?? DEFAULT_TIMELINE_SORT)
  };
}

export function upsertSavedView(savedViews, label, filters) {
  const normalizedLabel = normalizeSavedViewLabel(label);
  if (!normalizedLabel) {
    return savedViews;
  }

  const savedView = {
    id: buildSavedViewId(normalizedLabel),
    label: normalizedLabel,
    filters: createSavedViewFilters(filters)
  };
  const remainingViews = savedViews.filter((entry) => entry.id !== savedView.id);

  return [...remainingViews, savedView]
    .sort((left, right) => left.label.localeCompare(right.label))
    .slice(0, MAX_SAVED_VIEWS);
}

export function deleteSavedView(savedViews, savedViewId) {
  return savedViews.filter((savedView) => savedView.id !== savedViewId);
}

export function findMatchingSavedView(savedViews, filters) {
  const normalizedFilters = createSavedViewFilters(filters);

  return (
    savedViews.find((savedView) => areSavedViewFiltersEqual(savedView.filters, normalizedFilters)) ??
    null
  );
}

export function readSavedViews(serializedSavedViews) {
  if (typeof serializedSavedViews !== "string" || !serializedSavedViews.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(serializedSavedViews);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => sanitizeSavedView(entry))
      .filter(Boolean)
      .slice(0, MAX_SAVED_VIEWS);
  } catch {
    return [];
  }
}

export function serializeSavedViews(savedViews) {
  return JSON.stringify(
    savedViews
      .map((entry) => sanitizeSavedView(entry))
      .filter(Boolean)
      .slice(0, MAX_SAVED_VIEWS)
  );
}

function sanitizeSavedView(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const normalizedLabel = normalizeSavedViewLabel(entry.label);
  if (!normalizedLabel) {
    return null;
  }

  return {
    id: buildSavedViewId(normalizedLabel),
    label: normalizedLabel,
    filters: createSavedViewFilters(entry.filters)
  };
}

function areSavedViewFiltersEqual(left, right) {
  return (
    left.searchQuery === right.searchQuery &&
    left.reviewStatusFilter === right.reviewStatusFilter &&
    left.confidenceFilter === right.confidenceFilter &&
    left.historyFilter === right.historyFilter &&
    left.tagFilter === right.tagFilter &&
    left.draftFilter === right.draftFilter &&
    left.sortOrder === right.sortOrder
  );
}
