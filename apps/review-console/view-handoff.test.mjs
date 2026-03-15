import assert from "node:assert/strict";
import test from "node:test";

import {
  buildViewHandoffNote,
  buildViewHandoffPreviewItems,
  buildViewHandoffSummary
} from "./view-handoff.mjs";

test("buildViewHandoffSummary describes the selected event and queue context", () => {
  const summary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    queueContext: {
      visibleCount: 2,
      visiblePosition: 1,
      pendingCount: 1,
      pendingPosition: 1,
      remainingPendingAfterSelection: 0
    },
    selectedContextItems: [
      "Status: pending review",
      "Confidence: high confidence 88%",
      "Provenance: 2 sources across 2 feeds",
      "Review history: 1 review action"
    ],
    selectedConfidenceContext:
      "Signals: 2 asserted claims, 1 uncertain claim. Rationale: Two independent curated sources report matching inspection activity and delay symptoms.",
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
    summary.selectedConfidenceContext,
    "Signals: 2 asserted claims, 1 uncertain claim. Rationale: Two independent curated sources report matching inspection activity and delay symptoms."
  );
  assert.equal(
    summary.selectedReviewContext,
    "Latest review was edit by bootstrap-fixture. Note: Initial synthesized headline shortened for timeline readability."
  );
  assert.equal(
    summary.selectedQueueContext,
    "Visible 1 of 2 in this view. Pending 1 of 1. This is the only pending event in this view."
  );
  assert.equal(summary.nextPendingCopy, "");
  assert.equal(
    summary.recommendedPathCopy,
    "Start with the selected event. It is still pending in this view."
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
  assert.deepEqual(summary.includedState, [
    "Selected event",
    "Focused detail section",
    "Search: harbor",
    "Lowest confidence first",
    "Contract fixtures"
  ]);
});

test("buildViewHandoffSummary carries the next pending event when the selection is already reviewed", () => {
  const summary = buildViewHandoffSummary({
    selectedHeadline: "Port access restored after overnight channel sweep",
    filteredCount: 4,
    totalCount: 7,
    sourceLabel: "Local read API",
    queueContext: {
      visibleCount: 4,
      visiblePosition: 2,
      pendingCount: 2,
      pendingPosition: null,
      remainingPendingAfterSelection: 2
    },
    nextPendingEventId: "evt-east-grid",
    nextPendingHeadline: "Storm-related outage affects East Grid substation 7",
    filterSummary: {
      activeFilters: ["Status: approved"],
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: "Sort: Newest first"
    }
  });

  assert.equal(
    summary.selectedQueueContext,
    "Visible 2 of 4 in this view. 2 pending events remain elsewhere in this view."
  );
  assert.equal(summary.nextPendingEventId, "evt-east-grid");
  assert.equal(
    summary.nextPendingCopy,
    "Next pending in this view: Storm-related outage affects East Grid substation 7"
  );
  assert.equal(
    summary.recommendedPathCopy,
    "Use the current link for context, then open Next pending link to continue triage on the actionable event."
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

test("buildViewHandoffSummary marks source proof as handoff-note-only context", () => {
  const summary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    filterSummary: {
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: "Sort: Lowest confidence first"
    },
    selectedSourceProofItems: [
      "Harbor North security review extends outbound inspections (regional-port-bulletin, 35m before event): Outbound containers are subject to enhanced screening through the morning shift.",
      "Members report cargo delays at Harbor North terminal (coastal-shipping-association, 10m after event): Shippers reported three to five hour processing delays tied to elevated inspection activity."
    ]
  });

  assert.deepEqual(summary.noteOnlyState, ["Supporting source snapshots"]);
  assert.deepEqual(summary.selectedSourceProofItems, [
    "Harbor North security review extends outbound inspections (regional-port-bulletin, 35m before event): Outbound containers are subject to enhanced screening through the morning shift.",
    "Members report cargo delays at Harbor North terminal (coastal-shipping-association, 10m after event): Shippers reported three to five hour processing delays tied to elevated inspection activity."
  ]);
});

test("buildViewHandoffSummary carries source proof overflow copy when extra provenance stays in detail", () => {
  const summary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    filterSummary: {
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: "Sort: Lowest confidence first"
    },
    selectedSourceProofItems: [
      "Members report cargo delays at Harbor North terminal (coastal-shipping-association, 10m after event): Shippers reported three to five hour processing delays tied to elevated inspection activity."
    ],
    selectedSourceProofOverflowCopy: "1 more supporting source remains in provenance detail."
  });

  assert.equal(
    summary.selectedSourceProofOverflowCopy,
    "1 more supporting source remains in provenance detail."
  );
});

test("buildViewHandoffSummary marks confidence drivers as handoff-note-only context", () => {
  const summary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    filterSummary: {
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: "Sort: Lowest confidence first"
    },
    selectedConfidenceContext:
      "Signals: 2 asserted claims, 1 uncertain claim. Rationale: Two independent curated sources report matching inspection activity and delay symptoms."
  });

  assert.deepEqual(summary.noteOnlyState, ["Confidence driver snapshot"]);
  assert.equal(
    summary.selectedConfidenceContext,
    "Signals: 2 asserted claims, 1 uncertain claim. Rationale: Two independent curated sources report matching inspection activity and delay symptoms."
  );
});

test("buildViewHandoffPreviewItems groups the extended handoff context for the card preview", () => {
  const handoffSummary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    selectedConfidenceContext:
      "Signals: 2 asserted claims, 1 uncertain claim. Rationale: Two independent curated sources report matching inspection activity and delay symptoms.",
    selectedReviewContext:
      "Latest review was edit by bootstrap-fixture. Note: Initial synthesized headline shortened for timeline readability.",
    selectedSourceProofItems: [
      "Members report cargo delays at Harbor North terminal (coastal-shipping-association, 10m after event): Shippers reported three to five hour processing delays tied to elevated inspection activity."
    ],
    selectedSourceProofOverflowCopy:
      "1 more supporting source remains in provenance detail.",
    selectedSearchMatches: [
      {
        label: "Source",
        preview: "coastal-shipping-association",
        detailSectionId: "detail-provenance"
      },
      {
        label: "Participant",
        preview: "Harbor North Port Authority",
        detailSectionId: "detail-entities"
      }
    ],
    activeSearchFocusTarget: "detail-provenance"
  });

  assert.deepEqual(buildViewHandoffPreviewItems(handoffSummary), [
    {
      label: "Confidence drivers",
      value:
        "Signals: 2 asserted claims, 1 uncertain claim. Rationale: Two independent curated sources report matching inspection activity and delay symptoms."
    },
    {
      label: "Review context",
      value:
        "Latest review was edit by bootstrap-fixture. Note: Initial synthesized headline shortened for timeline readability."
    },
    {
      label: "Source proof",
      value:
        "Members report cargo delays at Harbor North terminal (coastal-shipping-association, 10m after event): Shippers reported three to five hour processing delays tied to elevated inspection activity."
    },
    {
      label: "Source proof summary",
      value: "1 more supporting source remains in provenance detail."
    },
    {
      label: "Focused search match",
      value:
        "Source: coastal-shipping-association; Participant: Harbor North Port Authority"
    }
  ]);
});

test("buildViewHandoffNote produces a paste-ready note for the current link", () => {
  const handoffSummary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    queueContext: {
      visibleCount: 2,
      visiblePosition: 1,
      pendingCount: 1,
      pendingPosition: 1,
      remainingPendingAfterSelection: 0
    },
    selectedContextItems: [
      "Status: pending review",
      "Confidence: high confidence 88%",
      "Provenance: 2 sources across 2 feeds",
      "Review history: 1 review action"
    ],
    selectedConfidenceContext:
      "Signals: 2 asserted claims, 1 uncertain claim. Rationale: Two independent curated sources report matching inspection activity and delay symptoms.",
    selectedReviewContext:
      "Latest review was edit by bootstrap-fixture. Note: Initial synthesized headline shortened for timeline readability.",
    selectedSourceProofItems: [
      "Members report cargo delays at Harbor North terminal (coastal-shipping-association, 10m after event): Shippers reported three to five hour processing delays tied to elevated inspection activity."
    ],
    selectedSourceProofOverflowCopy:
      "1 more supporting source remains in provenance detail.",
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
      "- Queue context: Visible 1 of 2 in this view. Pending 1 of 1. This is the only pending event in this view.",
      "- Confidence drivers: Signals: 2 asserted claims, 1 uncertain claim. Rationale: Two independent curated sources report matching inspection activity and delay symptoms.",
      "- Recommended path: Start with the selected event. It is still pending in this view.",
      "- Review context: Latest review was edit by bootstrap-fixture. Note: Initial synthesized headline shortened for timeline readability.",
      "- Source proof: Members report cargo delays at Harbor North terminal (coastal-shipping-association, 10m after event): Shippers reported three to five hour processing delays tied to elevated inspection activity.",
      "- Source proof summary: 1 more supporting source remains in provenance detail.",
      "- Current link: http://127.0.0.1:4173/apps/review-console/?q=harbor&sort=lowest_confidence&source=fixtures",
      "- Included in link: Selected event; Search: harbor; Lowest confidence first; Contract fixtures",
      "- Included in handoff note only: Confidence driver snapshot; Supporting source snapshots",
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
      "- Recommended path: Start with the selected event. It is still pending in this view.",
      "- Focused search match: Source: coastal-shipping-association; Participant: Harbor North Port Authority (+1 more match)",
      "- Current link: http://127.0.0.1:4173/apps/review-console/?q=harbor&sort=lowest_confidence&source=fixtures",
      "- Included in link: Selected event; Focused detail section; Search: harbor; Lowest confidence first; Contract fixtures",
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
    queueContext: {
      visibleCount: 1,
      visiblePosition: 1,
      pendingCount: 1,
      pendingPosition: 1,
      remainingPendingAfterSelection: 0
    },
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
      "- Queue context: Visible 1 of 1 in this view. Pending 1 of 1. This is the only pending event in this view.",
      "- Recommended path: Start with the selected event. It is still pending in this view.",
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

test("buildViewHandoffNote includes direct next pending links when the current selection is context only", () => {
  const handoffSummary = buildViewHandoffSummary({
    selectedHeadline: "Port access restored after overnight channel sweep",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Local read API",
    queueContext: {
      visibleCount: 2,
      visiblePosition: 1,
      pendingCount: 1,
      pendingPosition: null,
      remainingPendingAfterSelection: 1
    },
    filterSummary: {
      activeFilters: ["Search: outage", "Drafts: saved"],
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: null
    },
    draftFilter: "saved",
    nextPendingEventId: "evt-east-grid",
    nextPendingHeadline: "Storm-related outage affects East Grid substation 7"
  });

  const handoffNote = buildViewHandoffNote({
    handoffSummary,
    shareUrl:
      "http://127.0.0.1:4173/apps/review-console/?q=outage&drafts=saved&eventId=evt-reviewed",
    portableShareUrl:
      "http://127.0.0.1:4173/apps/review-console/?q=outage&eventId=evt-reviewed",
    nextPendingShareUrl:
      "http://127.0.0.1:4173/apps/review-console/?q=outage&drafts=saved&eventId=evt-east-grid",
    portableNextPendingShareUrl:
      "http://127.0.0.1:4173/apps/review-console/?q=outage&eventId=evt-east-grid"
  });

  assert.equal(
    handoffNote,
    [
      "Review console handoff",
      "",
      "- Selected event: Port access restored after overnight channel sweep",
      "- Queue: 2 of 7 events visible · Local read API",
      "- Queue context: Visible 1 of 2 in this view. 1 pending event remain elsewhere in this view.",
      "- Next pending in this view: Storm-related outage affects East Grid substation 7",
      "- Recommended path: Use the current link for context, then open Next pending link to continue triage on the actionable event.",
      "- Current link: http://127.0.0.1:4173/apps/review-console/?q=outage&drafts=saved&eventId=evt-reviewed",
      "- Portable link: http://127.0.0.1:4173/apps/review-console/?q=outage&eventId=evt-reviewed (saved-draft filter removed)",
      "- Next pending link: http://127.0.0.1:4173/apps/review-console/?q=outage&drafts=saved&eventId=evt-east-grid",
      "- Portable next pending link: http://127.0.0.1:4173/apps/review-console/?q=outage&eventId=evt-east-grid (saved-draft filter removed)",
      "- Included in link: Selected event; Search: outage; Pending first sort; Local read API",
      "- Needs local browser state: Saved-draft filter",
      "- Portability note: Saved-draft filtering stays in the copied current link, but it only reproduces on browsers that already have matching local drafts. Use Copy portable link to remove this dependency."
    ].join("\n")
  );
});
