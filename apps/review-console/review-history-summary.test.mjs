import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReviewHistorySummary,
  formatReviewActionCount
} from "./review-history-summary.mjs";

test("buildReviewHistorySummary returns null when no review actions exist", () => {
  assert.equal(buildReviewHistorySummary([]), null);
  assert.equal(buildReviewHistorySummary(undefined), null);
});

test("buildReviewHistorySummary uses the latest review action and counts history items", () => {
  const summary = buildReviewHistorySummary([
    {
      action: "edit",
      actorType: "analyst",
      actorName: "Local analyst",
      createdAt: "2026-03-14T08:23:36.204Z",
      notes: "Adjusted the wording to match the source excerpt."
    },
    {
      action: "approve",
      actorType: "system",
      actorName: "bootstrap-fixture",
      createdAt: "2026-03-13T08:23:36.204Z",
      notes: "Earlier baseline approval."
    }
  ]);

  assert.deepEqual(summary, {
    actionCount: 2,
    actionLabel: "edit",
    actorLabel: "Local analyst",
    createdAt: "2026-03-14T08:23:36.204Z",
    notePreview: "Adjusted the wording to match the source excerpt."
  });
});

test("buildReviewHistorySummary falls back when notes or actor name are missing", () => {
  const summary = buildReviewHistorySummary([
    {
      action: "reject",
      actorType: "system",
      actorName: "",
      createdAt: "2026-03-14T08:23:36.204Z",
      notes: "   "
    }
  ]);

  assert.deepEqual(summary, {
    actionCount: 1,
    actionLabel: "reject",
    actorLabel: "system",
    createdAt: "2026-03-14T08:23:36.204Z",
    notePreview: "No notes recorded."
  });
});

test("buildReviewHistorySummary truncates long note previews", () => {
  const summary = buildReviewHistorySummary([
    {
      action: "edit",
      actorType: "analyst",
      actorName: "Local analyst",
      createdAt: "2026-03-14T08:23:36.204Z",
      notes:
        "This note is intentionally much longer than the preview budget so the timeline card only shows a concise analyst-facing snippet."
    }
  ]);

  assert.equal(
    summary.notePreview,
    "This note is intentionally much longer than the preview budget so the timeline card only show..."
  );
});

test("formatReviewActionCount pluralizes correctly", () => {
  assert.equal(formatReviewActionCount(1), "1 review action");
  assert.equal(formatReviewActionCount(3), "3 review actions");
});
