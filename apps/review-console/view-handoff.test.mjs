import assert from "node:assert/strict";
import test from "node:test";

import { buildViewHandoffSummary } from "./view-handoff.mjs";

test("buildViewHandoffSummary describes the selected event and queue context", () => {
  const summary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    filterSummary: {
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: "Sort: Lowest confidence first"
    }
  });

  assert.equal(summary.selectedLabel, "Selected event");
  assert.equal(
    summary.selectedValue,
    "Inspection surge reported at Harbor North cargo terminal"
  );
  assert.equal(
    summary.contextLabel,
    "2 of 7 events visible · Contract fixtures · Lowest confidence first"
  );
  assert.equal(summary.isWarning, false);
  assert.equal(summary.showPortableCopyAction, false);
  assert.equal(
    summary.portabilityNote,
    "Selected event, filters, queue sort, source mode, and demo mode stay in the URL."
  );
});

test("buildViewHandoffSummary warns when saved-draft filtering depends on local state", () => {
  const summary = buildViewHandoffSummary({
    filteredCount: 1,
    totalCount: 7,
    sourceLabel: "Local read API",
    filterSummary: {
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: null
    },
    draftFilter: "saved"
  });

  assert.equal(summary.selectedLabel, "Queue state");
  assert.equal(summary.selectedValue, "No event is selected");
  assert.equal(summary.contextLabel, "1 of 7 events visible · Local read API");
  assert.equal(summary.isWarning, true);
  assert.equal(summary.showPortableCopyAction, true);
  assert.equal(
    summary.portabilityNote,
    "Saved-draft filtering depends on browser-local storage, so another analyst may reopen an empty queue. Use Copy portable link to remove this local-only filter."
  );
});
