import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCondensedFilterSummaryLabels,
  buildFilterSummary,
  buildReviewSafeOmissionLabels
} from "./filter-summary.mjs";

test("buildFilterSummary returns active filter labels for explicit controls", () => {
  assert.deepEqual(
    buildFilterSummary({
      savedViewLabel: "Harbor follow-up",
      searchQuery: "harbor north",
      reviewStatusFilter: "pending_review",
      confidenceFilter: "medium",
      historyFilter: "reviewed",
      tagFilter: "ports",
      demoMode: "normal"
    }),
    {
      activeFilters: [
        "Search: harbor north",
        "Status: Pending review",
        "Confidence: Medium confidence",
        "History: Reviewed before",
        "Tag: ports"
      ],
      hasActiveFilters: true,
      savedViewLabel: "Saved view: Harbor follow-up",
      sortLabel: null,
      demoModeLabel: null
    }
  );
});

test("buildFilterSummary keeps filter state empty when only demo override is active", () => {
  assert.deepEqual(
    buildFilterSummary({
      searchQuery: "",
      reviewStatusFilter: "all",
      confidenceFilter: "all",
      tagFilter: "all",
      demoMode: "empty"
    }),
    {
      activeFilters: [],
      hasActiveFilters: false,
      savedViewLabel: null,
      sortLabel: null,
      demoModeLabel: "Empty demo"
    }
  );
});

test("buildFilterSummary includes saved draft filters when attention lanes narrow the queue", () => {
  assert.deepEqual(
    buildFilterSummary({
      searchQuery: "",
      reviewStatusFilter: "all",
      confidenceFilter: "all",
      tagFilter: "all",
      draftFilter: "saved",
      demoMode: "normal"
    }),
    {
      activeFilters: ["Drafts: Saved notes"],
      hasActiveFilters: true,
      savedViewLabel: null,
      sortLabel: null,
      demoModeLabel: null
    }
  );
});

test("buildFilterSummary can surface the matching saved view label", () => {
  assert.deepEqual(
    buildFilterSummary({
      savedViewLabel: "Needs edits",
      searchQuery: "",
      reviewStatusFilter: "edited",
      confidenceFilter: "all",
      historyFilter: "all",
      tagFilter: "all",
      demoMode: "normal"
    }),
    {
      activeFilters: ["Status: Edited"],
      hasActiveFilters: true,
      savedViewLabel: "Saved view: Needs edits",
      sortLabel: null,
      demoModeLabel: null
    }
  );
});

test("buildFilterSummary includes review history filters when analysts reopen prior work", () => {
  assert.deepEqual(
    buildFilterSummary({
      searchQuery: "",
      reviewStatusFilter: "all",
      confidenceFilter: "all",
      historyFilter: "unreviewed",
      tagFilter: "all",
      draftFilter: "all",
      demoMode: "normal"
    }),
    {
      activeFilters: ["History: No review history"],
      hasActiveFilters: true,
      savedViewLabel: null,
      sortLabel: null,
      demoModeLabel: null
    }
  );
});

test("buildFilterSummary can surface a non-default queue sort without counting it as a filter", () => {
  assert.deepEqual(
    buildFilterSummary({
      searchQuery: "",
      reviewStatusFilter: "all",
      confidenceFilter: "all",
      historyFilter: "all",
      tagFilter: "all",
      draftFilter: "all",
      sortOrder: "lowest_confidence",
      demoMode: "normal"
    }),
    {
      activeFilters: [],
      hasActiveFilters: false,
      savedViewLabel: null,
      sortLabel: "Sort: Lowest confidence first",
      demoModeLabel: null
    }
  );
});

test("buildReviewSafeOmissionLabels surfaces review-only filters that reopening omits", () => {
  assert.deepEqual(
    buildReviewSafeOmissionLabels({
      reviewStatusFilter: "pending_review",
      historyFilter: "unreviewed",
      draftFilter: "saved"
    }),
    [
      "Status: Pending review",
      "History: No review history",
      "Drafts: Saved notes"
    ]
  );
});

test("buildCondensedFilterSummaryLabels keeps saved view, active filters, and sort concise", () => {
  const filterSummary = buildFilterSummary({
    savedViewLabel: "Harbor follow-up",
    searchQuery: "harbor north",
    reviewStatusFilter: "pending_review",
    confidenceFilter: "medium",
    historyFilter: "all",
    tagFilter: "all",
    draftFilter: "all",
    sortOrder: "lowest_confidence",
    demoMode: "normal"
  });

  assert.deepEqual(buildCondensedFilterSummaryLabels(filterSummary), [
    "Saved view: Harbor follow-up",
    "Sort: Lowest confidence first",
    "+3 more"
  ]);
});

test("buildCondensedFilterSummaryLabels keeps the queue sort visible when filters collapse", () => {
  const filterSummary = buildFilterSummary({
    searchQuery: "storm",
    reviewStatusFilter: "pending_review",
    confidenceFilter: "medium",
    historyFilter: "all",
    tagFilter: "all",
    draftFilter: "all",
    sortOrder: "lowest_confidence",
    demoMode: "normal"
  });

  assert.deepEqual(buildCondensedFilterSummaryLabels(filterSummary), [
    "Search: storm",
    "Sort: Lowest confidence first",
    "+2 more"
  ]);
});

test("buildCondensedFilterSummaryLabels returns every label when the summary is already short", () => {
  const filterSummary = buildFilterSummary({
    searchQuery: "storm",
    reviewStatusFilter: "all",
    confidenceFilter: "all",
    historyFilter: "all",
    tagFilter: "all",
    draftFilter: "all",
    sortOrder: "lowest_confidence",
    demoMode: "normal"
  });

  assert.deepEqual(buildCondensedFilterSummaryLabels(filterSummary), [
    "Search: storm",
    "Sort: Lowest confidence first"
  ]);
});
