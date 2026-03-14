export const SOURCE_FIXTURES = "fixtures";
export const SOURCE_API = "api";
export const DEMO_NORMAL = "normal";
export const DEMO_EMPTY = "empty";
export const DEMO_ERROR = "error";

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
    tagFilter: readString(params.get("tag"), "all"),
    selectedEventId: readString(params.get("eventId"), null)
  };
}

export function reconcileSelectedEventId(selectedEventId, timelineItems) {
  if (!timelineItems.length) {
    return null;
  }

  if (
    selectedEventId &&
    timelineItems.some((item) => item.eventId === selectedEventId)
  ) {
    return selectedEventId;
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

  if (state.tagFilter !== "all") {
    params.set("tag", state.tagFilter);
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
