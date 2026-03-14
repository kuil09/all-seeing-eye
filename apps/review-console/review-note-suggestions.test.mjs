import assert from "node:assert/strict";
import test from "node:test";

import {
  applyReviewNoteSuggestion,
  buildReviewNoteSuggestions
} from "./review-note-suggestions.mjs";

test("buildReviewNoteSuggestions returns evidence-based starters for the current detail", () => {
  const suggestions = buildReviewNoteSuggestions({
    event: {
      eventTime: "2026-03-14T03:30:00Z",
      confidence: {
        level: "medium",
        rationale:
          "Two feeds agree on the location, but the departure count still needs analyst review."
      }
    },
    sources: [
      {
        feedKey: "regional-port-bulletin",
        publishedAt: "2026-03-14T02:55:00Z"
      },
      {
        feedKey: "coastal-shipping-association",
        publishedAt: "2026-03-14T03:40:00Z"
      }
    ],
    reviewActions: [
      {
        action: "edit",
        actorName: "Analyst Rivera",
        createdAt: "2026-03-14T04:10:00Z",
        notes: "Headline should mention berth five, not berth four."
      }
    ]
  });

  assert.deepEqual(suggestions, [
    {
      id: "confidence-rationale",
      label: "Use confidence rationale",
      note:
        "Confidence rationale: Two feeds agree on the location, but the departure count still needs analyst review.",
      tone: "neutral"
    },
    {
      id: "source-posture",
      label: "Use source posture",
      note: "Source posture: 2 sources across 2 feeds. Window spans 35m before event to 10m after event.",
      tone: "neutral"
    },
    {
      id: "prior-review",
      label: "Reference prior review",
      note: "Prior review note: Headline should mention berth five, not berth four.",
      tone: "neutral"
    },
    {
      id: "edit-starter",
      label: "Start edit note",
      note: "Analyst edit required before approval because:",
      tone: "edit"
    },
    {
      id: "reject-starter",
      label: "Start reject note",
      note: "Rejecting pending stronger corroboration because:",
      tone: "reject"
    }
  ]);
});

test("buildReviewNoteSuggestions omits empty evidence snippets and keeps action starters", () => {
  const suggestions = buildReviewNoteSuggestions({
    event: {
      eventTime: "2026-03-14T03:30:00Z",
      confidence: {
        level: "high",
        rationale: "   "
      }
    },
    sources: [],
    reviewActions: [
      {
        action: "approve",
        actorName: "Analyst Rivera",
        createdAt: "2026-03-14T04:10:00Z",
        notes: " "
      }
    ]
  });

  assert.deepEqual(suggestions, [
    {
      id: "edit-starter",
      label: "Start edit note",
      note: "Analyst edit required before approval because:",
      tone: "edit"
    },
    {
      id: "reject-starter",
      label: "Start reject note",
      note: "Rejecting pending stronger corroboration because:",
      tone: "reject"
    }
  ]);
});

test("applyReviewNoteSuggestion seeds, appends, and deduplicates note starters", () => {
  assert.equal(
    applyReviewNoteSuggestion("", "Confidence rationale: Two feeds agree on the location."),
    "Confidence rationale: Two feeds agree on the location."
  );

  assert.equal(
    applyReviewNoteSuggestion(
      "Analyst edit required before approval because:",
      "Source posture: 2 sources across 2 feeds."
    ),
    "Analyst edit required before approval because:\n\nSource posture: 2 sources across 2 feeds."
  );

  assert.equal(
    applyReviewNoteSuggestion(
      "Source posture: 2 sources across 2 feeds.",
      " Source posture: 2   sources across 2 feeds. "
    ),
    "Source posture: 2 sources across 2 feeds."
  );
});
