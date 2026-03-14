import test from "node:test";
import assert from "node:assert/strict";

import { buildFilterSummary } from "./filter-summary.mjs";

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
        "Saved view: Harbor follow-up",
        "Search: harbor north",
        "Status: Pending review",
        "Confidence: Medium confidence",
        "History: Reviewed before",
        "Tag: ports"
      ],
      hasActiveFilters: true,
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
      activeFilters: ["Saved view: Needs edits", "Status: Edited"],
      hasActiveFilters: true,
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
      demoModeLabel: null
    }
  );
});
