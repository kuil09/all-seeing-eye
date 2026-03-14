import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReviewDraftPreview,
  clearReviewDraft,
  getReviewDraft,
  hasReviewDraft,
  pruneReviewDrafts,
  setReviewDraft
} from "./review-draft-state.mjs";

test("setReviewDraft stores drafts per event and lets them be recalled later", () => {
  let reviewDrafts = {};

  reviewDrafts = setReviewDraft(reviewDrafts, "evt-1", "Check source timing.");
  reviewDrafts = setReviewDraft(reviewDrafts, "evt-2", "Need a stronger excerpt.");

  assert.equal(getReviewDraft(reviewDrafts, "evt-1"), "Check source timing.");
  assert.equal(getReviewDraft(reviewDrafts, "evt-2"), "Need a stronger excerpt.");
});

test("setReviewDraft clears empty drafts and hasReviewDraft only counts non-blank content", () => {
  let reviewDrafts = {
    "evt-1": "Check source timing."
  };

  reviewDrafts = setReviewDraft(reviewDrafts, "evt-1", "   ");

  assert.deepEqual(reviewDrafts, {});
  assert.equal(hasReviewDraft(reviewDrafts, "evt-1"), false);
});

test("clearReviewDraft removes one draft without touching others", () => {
  const reviewDrafts = clearReviewDraft(
    {
      "evt-1": "Check source timing.",
      "evt-2": "Need a stronger excerpt."
    },
    "evt-1"
  );

  assert.deepEqual(reviewDrafts, {
    "evt-2": "Need a stronger excerpt."
  });
});

test("pruneReviewDrafts keeps only drafts for visible events with non-blank content", () => {
  const reviewDrafts = pruneReviewDrafts(
    {
      "evt-1": "Check source timing.",
      "evt-2": "   ",
      "evt-3": "Need a stronger excerpt."
    },
    ["evt-1", "evt-4"]
  );

  assert.deepEqual(reviewDrafts, {
    "evt-1": "Check source timing."
  });
});

test("buildReviewDraftPreview normalizes whitespace and truncates long drafts", () => {
  assert.equal(
    buildReviewDraftPreview("  Need   to verify   which source first reported the docking window.  "),
    "Need to verify which source first reported the docking window."
  );

  assert.equal(
    buildReviewDraftPreview(
      "Need to verify which source first reported the docking window before the event was synthesized into the queue."
    ),
    "Need to verify which source first reported the docking window before the event was synthesize..."
  );
});
