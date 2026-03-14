import assert from "node:assert/strict";
import test from "node:test";

import { buildReviewQueueContext } from "./review-queue-context.mjs";

test("buildReviewQueueContext reports pending position and remaining pending work", () => {
  const queueContext = buildReviewQueueContext(
    [
      { eventId: "evt_1", reviewStatus: "pending_review" },
      { eventId: "evt_2", reviewStatus: "approved" },
      { eventId: "evt_3", reviewStatus: "pending_review" },
      { eventId: "evt_4", reviewStatus: "pending_review" }
    ],
    "evt_3"
  );

  assert.deepEqual(queueContext, {
    visibleCount: 4,
    visiblePosition: 3,
    pendingCount: 3,
    pendingPosition: 2,
    remainingPendingAfterSelection: 1
  });
});

test("buildReviewQueueContext keeps reviewed selections aware of pending work elsewhere", () => {
  const queueContext = buildReviewQueueContext(
    [
      { eventId: "evt_1", reviewStatus: "approved" },
      { eventId: "evt_2", reviewStatus: "pending_review" },
      { eventId: "evt_3", reviewStatus: "edited" }
    ],
    "evt_3"
  );

  assert.deepEqual(queueContext, {
    visibleCount: 3,
    visiblePosition: 3,
    pendingCount: 1,
    pendingPosition: null,
    remainingPendingAfterSelection: 1
  });
});

test("buildReviewQueueContext returns null for missing selections or empty queues", () => {
  assert.equal(buildReviewQueueContext([], "evt_1"), null);
  assert.equal(
    buildReviewQueueContext([{ eventId: "evt_1", reviewStatus: "pending_review" }], "evt_missing"),
    null
  );
});
