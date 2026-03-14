import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUrlSearch,
  createInitialUiState,
  DEMO_EMPTY,
  SOURCE_FIXTURES,
  reconcileSelectedEventId
} from "./view-state.mjs";

test("createInitialUiState restores non-default URL state", () => {
  const state = createInitialUiState(
    "?eventId=evt_2&q= harbor &status=approved&confidence=medium&tag=ports&source=fixtures&demo=empty"
  );

  assert.deepEqual(state, {
    selectedEventId: "evt_2",
    searchQuery: "harbor",
    reviewStatusFilter: "approved",
    confidenceFilter: "medium",
    tagFilter: "ports",
    sourceMode: SOURCE_FIXTURES,
    demoMode: DEMO_EMPTY
  });
});

test("createInitialUiState falls back for invalid URL values", () => {
  const state = createInitialUiState(
    "?eventId=%20%20&q=%20%20&status=unknown&confidence=bad&source=remote&demo=broken"
  );

  assert.deepEqual(state, {
    selectedEventId: null,
    searchQuery: "",
    reviewStatusFilter: "all",
    confidenceFilter: "all",
    tagFilter: "all",
    sourceMode: "api",
    demoMode: "normal"
  });
});

test("buildUrlSearch omits defaults and keeps explicit filters", () => {
  const search = buildUrlSearch({
    selectedEventId: "evt_9",
    searchQuery: "shipyard",
    reviewStatusFilter: "edited",
    confidenceFilter: "low",
    tagFilter: "infrastructure",
    sourceMode: SOURCE_FIXTURES,
    demoMode: DEMO_EMPTY
  });

  assert.equal(
    search,
    "?eventId=evt_9&q=shipyard&status=edited&confidence=low&tag=infrastructure&source=fixtures&demo=empty"
  );
});

test("reconcileSelectedEventId clears stale selections when no rows remain", () => {
  assert.equal(reconcileSelectedEventId("evt_missing", []), null);
});

test("reconcileSelectedEventId keeps current row or falls back to the first visible row", () => {
  const timelineItems = [{ eventId: "evt_1" }, { eventId: "evt_2" }];

  assert.equal(reconcileSelectedEventId("evt_2", timelineItems), "evt_2");
  assert.equal(reconcileSelectedEventId("evt_missing", timelineItems), "evt_1");
});

test("reconcileSelectedEventId prefers the first pending row when selection is missing", () => {
  const timelineItems = [
    { eventId: "evt_1", reviewStatus: "approved" },
    { eventId: "evt_2", reviewStatus: "pending_review" },
    { eventId: "evt_3", reviewStatus: "edited" }
  ];

  assert.equal(reconcileSelectedEventId("evt_missing", timelineItems), "evt_2");
});
