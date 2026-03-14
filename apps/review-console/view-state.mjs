import {
  DEFAULT_TIMELINE_SORT,
  normalizeTimelineSort
} from "./timeline-sort.mjs";

export const SOURCE_FIXTURES = "fixtures";
export const SOURCE_API = "api";
export const DEMO_NORMAL = "normal";
export const DEMO_EMPTY = "empty";
export const DEMO_ERROR = "error";
export const DRAFT_FILTER_ALL = "all";
export const DRAFT_FILTER_SAVED = "saved";
export const HISTORY_FILTER_ALL = "all";
export const HISTORY_FILTER_REVIEWED = "reviewed";
export const HISTORY_FILTER_UNREVIEWED = "unreviewed";
const PENDING_REVIEW = "pending_review";

const SOURCE_MODES = new Set([SOURCE_FIXTURES, SOURCE_API]);
const DEMO_MODES = new Set([DEMO_NORMAL, DEMO_EMPTY, DEMO_ERROR]);
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

function readEnum(value, allowedValues, fallback) {
  return value && allowedValues.has(value) ? value : fallback;
}

function readString(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

export function createInitialUiState(search) {
  const params = new URLSearchParams(search);

  return {
    sourceMode: readEnum(params.get("source"), SOURCE_MODES, SOURCE_API),
    demoMode: readEnum(params.get("demo"), DEMO_MODES, DEMO_NORMAL),
    searchQuery: readString(params.get("q"), ""),
    reviewStatusFilter: readEnum(
      params.get("status"),
      REVIEW_STATUS_FILTERS,
      "all"
    ),
    confidenceFilter: readEnum(
      params.get("confidence"),
      CONFIDENCE_FILTERS,
      "all"
    ),
    historyFilter: readEnum(params.get("history"), HISTORY_FILTERS, HISTORY_FILTER_ALL),
    tagFilter: readString(params.get("tag"), "all"),
    draftFilter: readEnum(params.get("drafts"), DRAFT_FILTERS, DRAFT_FILTER_ALL),
    sortOrder: normalizeTimelineSort(params.get("sort")),
    selectedEventId: readString(params.get("eventId"), null)
  };
}

export function reconcileSelectedEventId(
  selectedEventId,
  timelineItems,
  { preferPendingFallback = true } = {}
) {
  if (!timelineItems.length) {
    return null;
  }

  if (
    selectedEventId &&
    timelineItems.some((item) => item.eventId === selectedEventId)
  ) {
    return selectedEventId;
  }

  if (preferPendingFallback) {
    return (
      timelineItems.find((item) => item.reviewStatus === PENDING_REVIEW)?.eventId ??
      timelineItems[0].eventId
    );
  }

  return timelineItems[0].eventId;
}

export function buildUrlSearch(state) {
  const params = new URLSearchParams();

  if (state.selectedEventId) {
    params.set("eventId", state.selectedEventId);
  }

  if (state.searchQuery) {
    params.set("q", state.searchQuery);
  }

  if (state.reviewStatusFilter !== "all") {
    params.set("status", state.reviewStatusFilter);
  }

  if (state.confidenceFilter !== "all") {
    params.set("confidence", state.confidenceFilter);
  }

  if (state.historyFilter !== HISTORY_FILTER_ALL) {
    params.set("history", state.historyFilter);
  }

  if (state.tagFilter !== "all") {
    params.set("tag", state.tagFilter);
  }

  if (state.draftFilter !== DRAFT_FILTER_ALL) {
    params.set("drafts", state.draftFilter);
  }

  if (state.sortOrder !== DEFAULT_TIMELINE_SORT) {
    params.set("sort", state.sortOrder);
  }

  if (state.sourceMode !== SOURCE_API) {
    params.set("source", state.sourceMode);
  }

  if (state.demoMode !== DEMO_NORMAL) {
    params.set("demo", state.demoMode);
  }

  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : "";
}
