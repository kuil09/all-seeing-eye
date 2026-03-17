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

export function buildReviewSafeOmissionLabels({
  reviewStatusFilter = "all",
  historyFilter = "all",
  draftFilter = "all"
}) {
  const omissions = [];

  if (reviewStatusFilter !== "all") {
    omissions.push(
      `Status: ${REVIEW_STATUS_LABELS[reviewStatusFilter] ?? reviewStatusFilter}`
    );
  }

  if (historyFilter !== "all") {
    omissions.push(`History: ${HISTORY_FILTER_LABELS[historyFilter] ?? historyFilter}`);
  }

  if (draftFilter !== "all") {
    omissions.push(`Drafts: ${DRAFT_FILTER_LABELS[draftFilter] ?? draftFilter}`);
  }

  return omissions;
}

export function buildCondensedFilterSummaryLabels(filterSummary, { maxLabels = 3 } = {}) {
  const normalizedMaxLabels =
    Number.isInteger(maxLabels) && maxLabels > 0 ? maxLabels : 3;
  const labels = [];
  const activeFilters = Array.isArray(filterSummary?.activeFilters)
    ? filterSummary.activeFilters.filter((label) => typeof label === "string" && label)
    : [];
  const sortLabel =
    typeof filterSummary?.sortLabel === "string" && filterSummary.sortLabel
      ? filterSummary.sortLabel
      : "";

  if (filterSummary?.savedViewLabel) {
    labels.push(filterSummary.savedViewLabel);
  }

  labels.push(...activeFilters);

  if (sortLabel) {
    labels.push(sortLabel);
  }

  if (labels.length <= normalizedMaxLabels) {
    return labels;
  }

  // Reopen affordances rely on the queue order, so keep non-default sort visible even
  // when the rest of the filter lens must collapse behind a "+N more" marker.
  if (sortLabel && normalizedMaxLabels >= 3) {
    const leadingLabels = [];

    if (filterSummary?.savedViewLabel) {
      leadingLabels.push(filterSummary.savedViewLabel);
    }

    leadingLabels.push(...activeFilters);

    const visibleLabels = leadingLabels.slice(0, Math.max(0, normalizedMaxLabels - 2));
    visibleLabels.push(sortLabel);
    const remainingCount = labels.length - visibleLabels.length;
    return [...visibleLabels, `+${remainingCount} more`];
  }

  const visibleLabels = labels.slice(0, Math.max(1, normalizedMaxLabels - 1));
  const remainingCount = labels.length - visibleLabels.length;
  return [...visibleLabels, `+${remainingCount} more`];
}
