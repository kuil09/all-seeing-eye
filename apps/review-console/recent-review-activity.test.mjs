import assert from "node:assert/strict";
import test from "node:test";

import {
  appendRecentReviewActivity,
  MAX_RECENT_REVIEW_ACTIVITY,
  pruneRecentReviewActivity,
  readRecentReviewActivity,
  serializeRecentReviewActivity
} from "./recent-review-activity.mjs";
import { SORT_LOWEST_CONFIDENCE } from "./timeline-sort.mjs";

function createActivityEntry(overrides = {}) {
  return {
    eventId: "evt_1",
    headline: "North harbor patrols tightened after overnight inspections",
    action: "approve",
    reviewStatus: "approved",
    createdAt: "2026-03-15T00:00:00.000Z",
    notes: "",
    reopenFilters: {
      searchQuery: "harbor",
      reviewStatusFilter: "all",
      confidenceFilter: "high",
      historyFilter: "all",
      tagFilter: "shipping",
      draftFilter: "all",
      sortOrder: "most_sources"
    },
    ...overrides
  };
}

test("appendRecentReviewActivity keeps the newest unique event first", () => {
  const initialActivity = [
    createActivityEntry(),
    createActivityEntry({
      eventId: "evt_2",
      headline: "Second event",
      action: "edit",
      reviewStatus: "edited",
      createdAt: "2026-03-15T00:05:00.000Z"
    })
  ];

  const activity = appendRecentReviewActivity(
    initialActivity,
    createActivityEntry({
      action: "reject",
      reviewStatus: "rejected",
      createdAt: "2026-03-15T00:08:00.000Z"
    })
  );

  assert.deepEqual(activity.map((entry) => entry.eventId), ["evt_1", "evt_2"]);
  assert.equal(activity[0].reviewStatus, "rejected");
  assert.equal(activity[0].action, "reject");
  assert.equal(activity[0].createdAt, "2026-03-15T00:08:00.000Z");
});

test("appendRecentReviewActivity caps the list length", () => {
  let activity = [];
  for (let index = 0; index < MAX_RECENT_REVIEW_ACTIVITY + 2; index += 1) {
    activity = appendRecentReviewActivity(
      activity,
      createActivityEntry({
        eventId: `evt_${index}`,
        headline: `Event ${index}`,
        createdAt: `2026-03-15T00:${String(index).padStart(2, "0")}:00.000Z`
      })
    );
  }

  assert.equal(activity.length, MAX_RECENT_REVIEW_ACTIVITY);
  assert.deepEqual(
    activity.map((entry) => entry.eventId),
    ["evt_7", "evt_6", "evt_5", "evt_4", "evt_3", "evt_2"]
  );
});

test("pruneRecentReviewActivity removes entries for missing events", () => {
  const activity = pruneRecentReviewActivity(
    [
      createActivityEntry(),
      createActivityEntry({
        eventId: "evt_2",
        headline: "Second event",
        createdAt: "2026-03-15T00:01:00.000Z"
      })
    ],
    ["evt_2"]
  );

  assert.deepEqual(activity.map((entry) => entry.eventId), ["evt_2"]);
});

test("readRecentReviewActivity tolerates malformed payloads and normalizes filters", () => {
  const serialized = JSON.stringify([
    createActivityEntry({
      eventId: "evt_2",
      headline: "Second event",
      notes: "  Re-check the trigger source timing before sharing.  ",
      reopenFilters: {
        searchQuery: " patrol ",
        historyFilter: "reviewed"
      }
    }),
    {
      eventId: "",
      headline: "Broken entry",
      createdAt: "not-a-date"
    }
  ]);

  const activity = readRecentReviewActivity(serialized);

  assert.equal(activity.length, 1);
  assert.equal(activity[0].notes, "Re-check the trigger source timing before sharing.");
  assert.deepEqual(activity[0].reopenFilters, {
    searchQuery: "patrol",
    reviewStatusFilter: "all",
    confidenceFilter: "all",
    historyFilter: "reviewed",
    tagFilter: "all",
    draftFilter: "all",
    sortOrder: "pending_first"
  });
});

test("serializeRecentReviewActivity preserves the normalized ordering", () => {
  const serialized = serializeRecentReviewActivity([
    createActivityEntry({
      eventId: "evt_older",
      headline: "Older event",
      createdAt: "2026-03-15T00:01:00.000Z",
      notes: "Older note"
    }),
    createActivityEntry({
      eventId: "evt_newer",
      headline: "Newer event",
      createdAt: "2026-03-15T00:02:00.000Z",
      notes: "Newer note"
    })
  ]);

  const activity = JSON.parse(serialized);
  assert.deepEqual(activity.map((entry) => entry.eventId), ["evt_older", "evt_newer"]);
  assert.deepEqual(activity.map((entry) => entry.notes), ["Older note", "Newer note"]);
  assert.deepEqual(activity.map((entry) => entry.reopenFilters.sortOrder), [
    "most_sources",
    "most_sources"
  ]);
});

test("readRecentReviewActivity preserves or normalizes the saved sort order", () => {
  const activity = readRecentReviewActivity(
    JSON.stringify([
      createActivityEntry({
        eventId: "evt_3",
        headline: "Third event",
        reopenFilters: {
          sortOrder: SORT_LOWEST_CONFIDENCE
        }
      }),
      createActivityEntry({
        eventId: "evt_4",
        headline: "Fourth event",
        createdAt: "2026-03-15T00:03:00.000Z",
        reopenFilters: {
          sortOrder: "bad-value"
        }
      })
    ])
  );

  assert.equal(activity[0].reopenFilters.sortOrder, SORT_LOWEST_CONFIDENCE);
  assert.equal(activity[1].reopenFilters.sortOrder, "pending_first");
});
