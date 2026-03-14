import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_TIMELINE_SORT,
  SORT_LOWEST_CONFIDENCE,
  SORT_MOST_SOURCES,
  SORT_NEWEST,
  SORT_OLDEST,
  SORT_PENDING_FIRST,
  getTimelineSortLabel,
  normalizeTimelineSort,
  sortTimelineItems
} from "./timeline-sort.mjs";

const timelineItems = [
  {
    eventId: "evt_reviewed_low",
    eventTime: "2026-03-15T00:01:00.000Z",
    reviewStatus: "approved",
    confidence: { score: 0.2 },
    sourceCount: 2
  },
  {
    eventId: "evt_pending_old",
    eventTime: "2026-03-14T22:00:00.000Z",
    reviewStatus: "pending_review",
    confidence: { score: 0.4 },
    sourceCount: 1
  },
  {
    eventId: "evt_pending_new",
    eventTime: "2026-03-15T01:00:00.000Z",
    reviewStatus: "pending_review",
    confidence: { score: 0.8 },
    sourceCount: 4
  },
  {
    eventId: "evt_reviewed_rich",
    eventTime: "2026-03-14T23:00:00.000Z",
    reviewStatus: "edited",
    confidence: { score: 0.6 },
    sourceCount: 5
  }
];

test("normalizeTimelineSort falls back to the default queue ordering", () => {
  assert.equal(normalizeTimelineSort("bad"), DEFAULT_TIMELINE_SORT);
  assert.equal(normalizeTimelineSort(SORT_NEWEST), SORT_NEWEST);
});

test("getTimelineSortLabel returns analyst-facing copy", () => {
  assert.equal(getTimelineSortLabel(SORT_PENDING_FIRST), "Pending first");
  assert.equal(getTimelineSortLabel("missing"), "Pending first");
});

test("sortTimelineItems defaults to pending-first ordering", () => {
  const sortedItems = sortTimelineItems(timelineItems);

  assert.deepEqual(
    sortedItems.map((item) => item.eventId),
    ["evt_pending_new", "evt_pending_old", "evt_reviewed_low", "evt_reviewed_rich"]
  );
});

test("sortTimelineItems can switch to newest and oldest ordering", () => {
  assert.deepEqual(
    sortTimelineItems(timelineItems, SORT_NEWEST).map((item) => item.eventId),
    ["evt_pending_new", "evt_reviewed_low", "evt_reviewed_rich", "evt_pending_old"]
  );
  assert.deepEqual(
    sortTimelineItems(timelineItems, SORT_OLDEST).map((item) => item.eventId),
    ["evt_pending_old", "evt_reviewed_rich", "evt_reviewed_low", "evt_pending_new"]
  );
});

test("sortTimelineItems can prioritize low-confidence or high-evidence rows", () => {
  assert.deepEqual(
    sortTimelineItems(timelineItems, SORT_LOWEST_CONFIDENCE).map((item) => item.eventId),
    ["evt_reviewed_low", "evt_pending_old", "evt_reviewed_rich", "evt_pending_new"]
  );
  assert.deepEqual(
    sortTimelineItems(timelineItems, SORT_MOST_SOURCES).map((item) => item.eventId),
    ["evt_reviewed_rich", "evt_pending_new", "evt_reviewed_low", "evt_pending_old"]
  );
});
