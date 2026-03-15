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
    "Confidence: high confidence 88%",
    "Provenance: 2 sources across 2 feeds"
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
    "Visible 1 of 2. Pending 1 of 1. Only pending event in this queue."
  );
  assert.equal(summary.nextPendingCopy, "");
  assert.equal(
    summary.recommendedPathCopy,
    "Start here. This event is still pending."
  );
  assert.deepEqual(summary.localDependentState, []);
  assert.deepEqual(summary.localOnlyState, []);
  assert.equal(summary.isWarning, false);
  assert.equal(summary.showPortableCopyAction, false);
  assert.equal(summary.selectedSearchLabel, "");
  assert.equal(summary.selectedSearchContext, "");
  assert.deepEqual(summary.noteOnlyState, ["Reviewer context below"]);
  assert.equal(summary.portabilityNote, "");
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
  assert.deepEqual(summary.noteOnlyState, ["Reviewer context below"]);
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
    selectedContextItems: [
      "Status: approved",
      "Confidence: medium confidence 61%",
      "Provenance: 1 source across 1 feed"
    ],
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
    "Visible 2 of 4. 2 pending events remain elsewhere in this queue."
  );
  assert.equal(summary.nextPendingEventId, "evt-east-grid");
  assert.equal(summary.showNextPendingCopyAction, true);
  assert.equal(
    summary.helperCopy,
    "Copy this context, or hand off the next pending event below."
  );
  assert.deepEqual(summary.selectedContextItems, [
    "Confidence: medium confidence 61%",
    "Provenance: 1 source across 1 feed",
    "Status: approved"
  ]);
  assert.equal(
    summary.nextPendingCopy,
    "Next pending: Storm-related outage affects East Grid substation 7"
  );
  assert.equal(
    summary.recommendedPathCopy,
    "Start here for context, then continue with next pending."
  );
});

test("buildViewHandoffSummary keeps the next-step copy compact when more pending work remains", () => {
  const summary = buildViewHandoffSummary({
    selectedHeadline: "Storm-related outage affects East Grid substation 7",
    filteredCount: 3,
    totalCount: 7,
    sourceLabel: "Local read API",
    queueContext: {
      visibleCount: 3,
      visiblePosition: 1,
      pendingCount: 2,
      pendingPosition: 1,
      remainingPendingAfterSelection: 1
    },
    nextPendingEventId: "evt-harbor-north",
    nextPendingHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filterSummary: {
      activeFilters: ["Search: outage"],
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: null
    }
  });

  assert.equal(
    summary.selectedQueueContext,
    "Visible 1 of 3. Pending 1 of 2. 1 pending event remains after this one."
  );
  assert.equal(summary.showNextPendingCopyAction, false);
  assert.equal(
    summary.recommendedPathCopy,
    "Start here, then continue with next pending."
  );
});

test("buildViewHandoffSummary keeps review-history count when detailed review context is unavailable", () => {
  const summary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    selectedContextItems: [
      "Confidence: high confidence 88%",
      "Review history: 1 review action"
    ],
    filterSummary: {
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: "Sort: Lowest confidence first"
    }
  });

  assert.deepEqual(summary.selectedContextItems, [
    "Confidence: high confidence 88%",
    "Review history: 1 review action"
  ]);
});

test("buildViewHandoffSummary keeps pending status when queue context is unavailable", () => {
  const summary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    selectedContextItems: [
      "Status: pending review",
      "Confidence: high confidence 88%"
    ],
    filterSummary: {
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: "Sort: Lowest confidence first"
    }
  });

  assert.deepEqual(summary.selectedContextItems, [
    "Status: pending review",
    "Confidence: high confidence 88%"
  ]);
});

test("buildViewHandoffSummary drops low-signal no-prior-review copy from reviewer snapshot", () => {
  const summary = buildViewHandoffSummary({
    selectedHeadline: "Inspection surge reported at Harbor North cargo terminal",
    filteredCount: 2,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    selectedContextItems: [
      "Review history: No prior review",
      "Status: pending review",
      "Provenance: 2 sources across 2 feeds",
      "Confidence: high confidence 88%"
    ],
    queueContext: {
      visibleCount: 2,
      visiblePosition: 1,
      pendingCount: 1,
      pendingPosition: 1,
      remainingPendingAfterSelection: 0
    },
    filterSummary: {
      hasActiveFilters: true,
      demoModeLabel: "",
      sortLabel: "Sort: Lowest confidence first"
    }
  });

  assert.deepEqual(summary.selectedContextItems, [
    "Confidence: high confidence 88%",
    "Provenance: 2 sources across 2 feeds"
  ]);
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
    "Saved-draft filtering stays in the copied start link, but it only reproduces on browsers that already have matching local drafts. Use Copy start link without saved drafts to remove this dependency."
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
  assert.deepEqual(summary.noteOnlyState, ["Reviewer context below"]);
  assert.deepEqual(summary.localOnlyState, [
    "Draft note text",
    "Saved view label: Ports needing edits"
  ]);
  assert.equal(summary.isWarning, true);
  assert.equal(
    summary.portabilityNote,
    'The copied start link reopens this queue, but draft note text and saved view label "Ports needing edits" stay in this browser only. Copy review note includes the current draft snapshot for reviewer context.'
  );
});

test("buildViewHandoffSummary keeps portability note when demo mode changes the replayed state", () => {
  const summary = buildViewHandoffSummary({
    filteredCount: 0,
    totalCount: 7,
    sourceLabel: "Contract fixtures",
    filterSummary: {
      hasActiveFilters: false,
      demoModeLabel: "Empty demo",
      sortLabel: null
    },
    demoMode: "empty"
  });

  assert.deepEqual(summary.includedState, [
    "Queue state",
    "Pending first sort",
    "Contract fixtures",
    "Empty demo"
  ]);
  assert.equal(
    summary.portabilityNote,
    "Demo mode stays in the URL so the next viewer reopens this QA state instead of the normal queue."
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

  assert.deepEqual(summary.noteOnlyState, ["Evidence appendix below"]);
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

  assert.deepEqual(summary.noteOnlyState, ["Reviewer context below"]);
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
      "Open now",
      "- Selected event: Inspection surge reported at Harbor North cargo terminal",
      "- Recommended path: Start here. This event is still pending.",
      "- Start here: [Reopen selected event](http://127.0.0.1:4173/apps/review-console/?q=harbor&sort=lowest_confidence&source=fixtures)",
      "",
      "Queue snapshot",
      "- Queue: 2 of 7 events visible · Contract fixtures · Lowest confidence first",
      "- Reviewer snapshot: Confidence: high confidence 88%; Provenance: 2 sources across 2 feeds",
      "- Queue context: Visible 1 of 2. Pending 1 of 1. Only pending event in this queue.",
      "",
      "Reviewer context",
      "- Confidence drivers: Signals: 2 asserted claims, 1 uncertain claim. Rationale: Two independent curated sources report matching inspection activity and delay symptoms.",
      "- Review context: Latest review was edit by bootstrap-fixture. Note: Initial synthesized headline shortened for timeline readability.",
      "",
      "Evidence appendix",
      "- Source proof: Members report cargo delays at Harbor North terminal (coastal-shipping-association, 10m after event): Shippers reported three to five hour processing delays tied to elevated inspection activity.",
      "- Source proof summary: 1 more supporting source remains in provenance detail.",
      "",
      "Handoff scope",
      "- Included in link: Selected event; Search: harbor; Lowest confidence first; Contract fixtures"
    ].join("\n")
  );
});

test("buildViewHandoffNote keeps active search rationale in reviewer context", () => {
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
      "Open now",
      "- Selected event: Inspection surge reported at Harbor North cargo terminal",
      "- Recommended path: Start here. This event is still pending.",
      "- Start here: [Reopen selected event](http://127.0.0.1:4173/apps/review-console/?q=harbor&sort=lowest_confidence&source=fixtures)",
      "",
      "Queue snapshot",
      "- Queue: 2 of 7 events visible · Contract fixtures · Lowest confidence first",
      "",
      "Reviewer context",
      "- Focused search match: Source: coastal-shipping-association; Participant: Harbor North Port Authority (+1 more match)",
      "",
      "Handoff scope",
      "- Included in link: Selected event; Focused detail section; Search: harbor; Lowest confidence first; Contract fixtures"
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
      "Open now",
      "- Selected event: Storm-related outage affects East Grid substation 7",
      "- Recommended path: Start here. This event is still pending.",
      "- Start here: [Reopen selected event](http://127.0.0.1:4173/apps/review-console/?q=outage&drafts=saved&eventId=evt-1)",
      "- Start here without saved-draft filter: [Reopen selected event without saved-draft filter](http://127.0.0.1:4173/apps/review-console/?q=outage&eventId=evt-1)",
      "",
      "Queue snapshot",
      "- Queue: 1 of 7 events visible · Local read API",
      "- Queue context: Visible 1 of 1. Pending 1 of 1. Only pending event in this queue.",
      "",
      "Reviewer context",
      "- Draft snapshot: Portable handoff should keep this event selected.",
      "",
      "Handoff scope",
      "- Included in link: Selected event; Search: outage; Pending first sort; Local read API",
      "- Needs local browser state: Saved-draft filter",
      "- Stays local: Draft note text; Saved view label: Ports needing edits",
      "- Portability note: Saved-draft filtering stays in the copied start link, but it only reproduces on browsers that already have matching local drafts. Use Copy start link without saved drafts to remove this dependency. Copy review note includes the current draft snapshot for reviewer context."
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
      "Open now",
      "- Selected event: Port access restored after overnight channel sweep",
      "- Start here: [Reopen selected event](http://127.0.0.1:4173/apps/review-console/?q=outage&drafts=saved&eventId=evt-reviewed)",
      "- Start here without saved-draft filter: [Reopen selected event without saved-draft filter](http://127.0.0.1:4173/apps/review-console/?q=outage&eventId=evt-reviewed)",
      "- Continue with next pending: [Reopen next pending event](http://127.0.0.1:4173/apps/review-console/?q=outage&drafts=saved&eventId=evt-east-grid)",
      "- Continue with next pending without saved-draft filter: [Reopen next pending event without saved-draft filter](http://127.0.0.1:4173/apps/review-console/?q=outage&eventId=evt-east-grid)",
      "",
      "Queue snapshot",
      "- Queue: 2 of 7 events visible · Local read API",
      "- Queue context: Visible 1 of 2. 1 pending event remains elsewhere in this queue.",
      "- Next pending: Storm-related outage affects East Grid substation 7",
      "",
      "Handoff scope",
      "- Included in link: Selected event; Search: outage; Pending first sort; Local read API",
      "- Needs local browser state: Saved-draft filter",
      "- Portability note: Saved-draft filtering stays in the copied start link, but it only reproduces on browsers that already have matching local drafts. Use Copy start link without saved drafts to remove this dependency."
    ].join("\n")
  );
});
