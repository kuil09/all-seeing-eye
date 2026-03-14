import assert from "node:assert/strict";
import test from "node:test";

import { resolveNextPendingEventId } from "./review-queue-navigation.mjs";

test("resolveNextPendingEventId prefers the next pending event after the current row", () => {
  const nextEventId = resolveNextPendingEventId(
    [
      { eventId: "evt_1", reviewStatus: "pending_review" },
      { eventId: "evt_2", reviewStatus: "approved" },
      { eventId: "evt_3", reviewStatus: "pending_review" }
    ],
    "evt_1"
  );

  assert.equal(nextEventId, "evt_3");
});

test("resolveNextPendingEventId wraps to earlier rows when the current row is the last pending item in order", () => {
  const nextEventId = resolveNextPendingEventId(
    [
      { eventId: "evt_1", reviewStatus: "pending_review" },
      { eventId: "evt_2", reviewStatus: "pending_review" },
      { eventId: "evt_3", reviewStatus: "pending_review" }
    ],
    "evt_3"
  );

  assert.equal(nextEventId, "evt_1");
});

test("resolveNextPendingEventId falls back to the first pending event when the current selection is missing", () => {
  const nextEventId = resolveNextPendingEventId(
    [
      { eventId: "evt_1", reviewStatus: "approved" },
      { eventId: "evt_2", reviewStatus: "pending_review" },
      { eventId: "evt_3", reviewStatus: "pending_review" }
    ],
    "evt_missing"
  );

  assert.equal(nextEventId, "evt_2");
});

test("resolveNextPendingEventId returns null when no other pending events remain", () => {
  const nextEventId = resolveNextPendingEventId(
    [
      { eventId: "evt_1", reviewStatus: "pending_review" },
      { eventId: "evt_2", reviewStatus: "approved" }
    ],
    "evt_1"
  );

  assert.equal(nextEventId, null);
});
