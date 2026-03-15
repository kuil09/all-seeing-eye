import assert from "node:assert/strict";
import test from "node:test";

import {
  buildViewHandoffNote,
  buildViewHandoffSummary
} from "./view-handoff.mjs";

test("buildViewHandoffSummary describes the selected event and queue context", () => {
  const summary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    selectedContextItems: [
      "Status: pending review",
      "Confidence: high confidence 88%",
      "Provenance: 2 sources across 2 feeds",
      "Review history: 1 review action"
    ],
    selectedReviewContext:
      "Latest review was edit by bootstrap-fixture. Note: Initial synthesized headline shortened for timeline readability.",
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
  assert.deepEqual(summary.includedState, [
    "Selected event",
    "Lowest confidence first",
    "Contract fixtures"
  ]);
  assert.deepEqual(summary.selectedContextItems, [
    "Status: pending review",
    "Confidence: high confidence 88%",
    "Provenance: 2 sources across 2 feeds",
    "Review history: 1 review action"
  ]);
  assert.equal(
    summary.selectedReviewContext,
    "Latest review was edit by bootstrap-fixture. Note: Initial synthesized headline shortened for timeline readability."
  );
  assert.deepEqual(summary.localDependentState, []);
  assert.deepEqual(summary.localOnlyState, []);
  assert.equal(summary.isWarning, false);
  assert.equal(summary.showPortableCopyAction, false);
  assert.equal(summary.selectedSearchLabel, "");
  assert.equal(summary.selectedSearchContext, "");
  assert.equal(
    summary.portabilityNote,
    "Selected event, filters, queue sort, source mode, and demo mode stay in the URL."
  );
});

test("buildViewHandoffSummary prioritizes the active search focus in handoff context", () => {
  const summary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    filterSummary: {
      activeFilters: ["Search: harbor"],
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: "Sort: Lowest confidence first"
    },
    selectedSearchMatches: [
      {
        label: "Participant",
        preview: "Harbor North Port Authority",
        detailSectionId: "detail-entities"
      },
      {
        label: "Source",
        preview: "coastal-shipping-association",
        detailSectionId: "detail-provenance"
      },
      {
        label: "Review history",
        preview: "Waiting for one more source before approving.",
        detailSectionId: "detail-review-history"
      }
    ],
    activeSearchFocusTarget: "detail-provenance"
  });

  assert.equal(summary.selectedSearchLabel, "Focused search match");
  assert.equal(
    summary.selectedSearchContext,
    "Source: coastal-shipping-association; Participant: Harbor North Port Authority (+1 more match)"
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
  assert.deepEqual(summary.includedState, [
    "Queue state",
    "Pending first sort",
    "Local read API"
  ]);
  assert.deepEqual(summary.localDependentState, ["Saved-draft filter"]);
  assert.deepEqual(summary.localOnlyState, []);
  assert.equal(summary.isWarning, true);
  assert.equal(summary.showPortableCopyAction, true);
  assert.equal(
    summary.portabilityNote,
    "Saved-draft filtering stays in the copied current link, but it only reproduces on browsers that already have matching local drafts. Use Copy portable link to remove this dependency."
  );
});

test("buildViewHandoffSummary calls out local-only draft notes and saved-view labels", () => {
  const summary = buildViewHandoffSummary({
    selectedHeadline: "Storm-related outage affects East Grid substation 7",
    filteredCount: 3,
    totalCount: 7,
    sourceLabel: "Local read API",
    filterSummary: {
      activeFilters: ["Search: outage"],
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: null
    },
    hasSelectedDraft: true,
    activeSavedViewLabel: "Ports needing edits",
    selectedDraftPreview: "Need to verify whether the outage alert reached both substations."
  });

  assert.deepEqual(summary.includedState, [
    "Selected event",
    "Search: outage",
    "Pending first sort",
    "Local read API"
  ]);
  assert.deepEqual(summary.localDependentState, []);
  assert.deepEqual(summary.noteOnlyState, ["Selected draft note snapshot"]);
  assert.deepEqual(summary.localOnlyState, [
    "Draft note text",
    "Saved view label: Ports needing edits"
  ]);
  assert.equal(summary.isWarning, true);
  assert.equal(
    summary.portabilityNote,
    'The copied URL reopens this queue, but draft note text and saved view label "Ports needing edits" stay in this browser only. Copy handoff note includes the current draft snapshot for reviewer context.'
  );
});

test("buildViewHandoffNote produces a paste-ready note for the current link", () => {
  const handoffSummary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    selectedContextItems: [
      "Status: pending review",
      "Confidence: high confidence 88%",
      "Provenance: 2 sources across 2 feeds",
      "Review history: 1 review action"
    ],
    selectedReviewContext:
      "Latest review was edit by bootstrap-fixture. Note: Initial synthesized headline shortened for timeline readability.",
    filterSummary: {
      activeFilters: ["Search: harbor"],
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: "Sort: Lowest confidence first"
    }
  });

  const handoffNote = buildViewHandoffNote({
    handoffSummary,
    shareUrl:
      "http://127.0.0.1:4173/apps/review-console/?q=harbor&sort=lowest_confidence&source=fixtures"
  });

  assert.equal(
    handoffNote,
    [
      "Review console handoff",
      "",
      "- Selected event: Inspection surge reported at Harbor North cargo terminal",
      "- Queue: 2 of 7 events visible · Contract fixtures · Lowest confidence first",
      "- Reviewer snapshot: Status: pending review; Confidence: high confidence 88%; Provenance: 2 sources across 2 feeds; Review history: 1 review action",
      "- Review context: Latest review was edit by bootstrap-fixture. Note: Initial synthesized headline shortened for timeline readability.",
      "- Current link: http://127.0.0.1:4173/apps/review-console/?q=harbor&sort=lowest_confidence&source=fixtures",
      "- Included in link: Selected event; Search: harbor; Lowest confidence first; Contract fixtures",
      "- Portability note: Selected event, filters, queue sort, source mode, and demo mode stay in the URL."
    ].join("\n")
  );
});

test("buildViewHandoffNote includes active search rationale before the copied links", () => {
  const handoffSummary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    filterSummary: {
      activeFilters: ["Search: harbor"],
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: "Sort: Lowest confidence first"
    },
    selectedSearchMatches: [
      {
        label: "Participant",
        preview: "Harbor North Port Authority",
        detailSectionId: "detail-entities"
      },
      {
        label: "Source",
        preview: "coastal-shipping-association",
        detailSectionId: "detail-provenance"
      },
      {
        label: "Review history",
        preview: "Waiting for one more source before approving.",
        detailSectionId: "detail-review-history"
      }
    ],
    activeSearchFocusTarget: "detail-provenance"
  });

  const handoffNote = buildViewHandoffNote({
    handoffSummary,
    shareUrl:
      "http://127.0.0.1:4173/apps/review-console/?q=harbor&sort=lowest_confidence&source=fixtures"
  });

  assert.equal(
    handoffNote,
    [
      "Review console handoff",
      "",
      "- Selected event: Inspection surge reported at Harbor North cargo terminal",
      "- Queue: 2 of 7 events visible · Contract fixtures · Lowest confidence first",
      "- Focused search match: Source: coastal-shipping-association; Participant: Harbor North Port Authority (+1 more match)",
      "- Current link: http://127.0.0.1:4173/apps/review-console/?q=harbor&sort=lowest_confidence&source=fixtures",
      "- Included in link: Selected event; Search: harbor; Lowest confidence first; Contract fixtures",
      "- Portability note: Selected event, filters, queue sort, source mode, and demo mode stay in the URL."
    ].join("\n")
  );
});

test("buildViewHandoffNote includes portable and local-only scope details when needed", () => {
  const handoffSummary = buildViewHandoffSummary({
    selectedHeadline: "Storm-related outage affects East Grid substation 7",
    filteredCount: 1,
    totalCount: 7,
    sourceLabel: "Local read API",
    filterSummary: {
      activeFilters: ["Search: outage", "Drafts: saved"],
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: null
    },
    draftFilter: "saved",
    hasSelectedDraft: true,
    activeSavedViewLabel: "Ports needing edits",
    selectedDraftPreview: "Portable handoff should keep this event selected."
  });

  const handoffNote = buildViewHandoffNote({
    handoffSummary,
    shareUrl:
      "http://127.0.0.1:4173/apps/review-console/?q=outage&drafts=saved&eventId=evt-1",
    portableShareUrl:
      "http://127.0.0.1:4173/apps/review-console/?q=outage&eventId=evt-1"
  });

  assert.equal(
    handoffNote,
    [
      "Review console handoff",
      "",
      "- Selected event: Storm-related outage affects East Grid substation 7",
      "- Queue: 1 of 7 events visible · Local read API",
      "- Current link: http://127.0.0.1:4173/apps/review-console/?q=outage&drafts=saved&eventId=evt-1",
      "- Portable link: http://127.0.0.1:4173/apps/review-console/?q=outage&eventId=evt-1 (saved-draft filter removed)",
      "- Included in link: Selected event; Search: outage; Pending first sort; Local read API",
      "- Included in handoff note only: Selected draft note snapshot",
      "- Needs local browser state: Saved-draft filter",
      "- Stays local: Draft note text; Saved view label: Ports needing edits",
      "- Draft snapshot: Portable handoff should keep this event selected.",
      "- Portability note: Saved-draft filtering stays in the copied current link, but it only reproduces on browsers that already have matching local drafts. Use Copy portable link to remove this dependency. Copy handoff note includes the current draft snapshot for reviewer context."
    ].join("\n")
  );
});
