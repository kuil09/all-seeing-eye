import {
  DEFAULT_TIMELINE_SORT,
  getTimelineSortLabel
} from "./timeline-sort.mjs";

const REVIEW_STATUS_LABELS = {
  pending_review: "Pending review",
  approved: "Approved",
  edited: "Edited",
  rejected: "Rejected"
};

const CONFIDENCE_LABELS = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence"
};

const HISTORY_FILTER_LABELS = {
  reviewed: "Reviewed before",
  unreviewed: "No review history"
};

const DRAFT_FILTER_LABELS = {
  saved: "Saved notes"
};

const DEMO_MODE_LABELS = {
  normal: "Normal demo",
  empty: "Empty demo",
  error: "Error demo"
};

export function buildFilterSummary({
  savedViewLabel = "",
  searchQuery = "",
  reviewStatusFilter = "all",
  confidenceFilter = "all",
  historyFilter = "all",
  tagFilter = "all",
  draftFilter = "all",
  sortOrder = DEFAULT_TIMELINE_SORT,
  demoMode = "normal"
}) {
  const activeFilters = [];

  if (searchQuery) {
    activeFilters.push(`Search: ${searchQuery}`);
  }

  if (reviewStatusFilter !== "all") {
    activeFilters.push(`Status: ${REVIEW_STATUS_LABELS[reviewStatusFilter] ?? reviewStatusFilter}`);
  }

  if (confidenceFilter !== "all") {
    activeFilters.push(`Confidence: ${CONFIDENCE_LABELS[confidenceFilter] ?? confidenceFilter}`);
  }

  if (historyFilter !== "all") {
    activeFilters.push(`History: ${HISTORY_FILTER_LABELS[historyFilter] ?? historyFilter}`);
  }

  if (tagFilter !== "all") {
    activeFilters.push(`Tag: ${tagFilter}`);
  }

  if (draftFilter !== "all") {
    activeFilters.push(`Drafts: ${DRAFT_FILTER_LABELS[draftFilter] ?? draftFilter}`);
  }

  return {
    activeFilters,
    hasActiveFilters: activeFilters.length > 0,
    savedViewLabel: savedViewLabel ? `Saved view: ${savedViewLabel}` : null,
    sortLabel:
      sortOrder === DEFAULT_TIMELINE_SORT
        ? null
        : `Sort: ${getTimelineSortLabel(sortOrder)}`,
    demoModeLabel: demoMode === "normal" ? null : DEMO_MODE_LABELS[demoMode] ?? demoMode
  };
}
