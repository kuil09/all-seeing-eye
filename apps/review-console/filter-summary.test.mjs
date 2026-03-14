import test from "node:test";
import assert from "node:assert/strict";

import { buildFilterSummary } from "./filter-summary.mjs";

test("buildFilterSummary returns active filter labels for explicit controls", () => {
  assert.deepEqual(
    buildFilterSummary({
      searchQuery: "harbor north",
      reviewStatusFilter: "pending_review",
      confidenceFilter: "medium",
      tagFilter: "ports",
      demoMode: "normal"
    }),
    {
      activeFilters: [
        "Search: harbor north",
        "Status: Pending review",
        "Confidence: Medium confidence",
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
