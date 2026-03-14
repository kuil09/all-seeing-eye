import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSourceProvenanceSummary,
  formatSourceRelativeTiming
} from "./source-provenance-summary.mjs";

test("buildSourceProvenanceSummary returns null when no sources are available", () => {
  assert.equal(buildSourceProvenanceSummary([], "2026-03-14T03:30:00Z"), null);
  assert.equal(buildSourceProvenanceSummary(undefined, "2026-03-14T03:30:00Z"), null);
});

test("buildSourceProvenanceSummary deduplicates feeds and summarizes a cross-event window", () => {
  const summary = buildSourceProvenanceSummary(
    [
      {
        feedKey: "regional-port-bulletin",
        publishedAt: "2026-03-14T02:55:00Z"
      },
      {
        feedKey: "coastal-shipping-association",
        publishedAt: "2026-03-14T03:40:00Z"
      }
    ],
    "2026-03-14T03:30:00Z"
  );

  assert.deepEqual(summary, {
    sourceCount: 2,
    feedCount: 2,
    postureLabel: "2 sources across 2 feeds",
    timingLabel: "Window spans 35m before event to 10m after event",
    visibleFeedLabels: ["regional-port-bulletin", "coastal-shipping-association"],
    remainingFeedCount: 0
  });
});

test("buildSourceProvenanceSummary reports latest-source timing and feed overflow", () => {
  const summary = buildSourceProvenanceSummary(
    [
      {
        feedKey: "feed-alpha",
        publishedAt: "2026-03-14T02:00:00Z"
      },
      {
        feedKey: "feed-beta",
        publishedAt: "2026-03-14T03:25:00Z"
      },
      {
        feedKey: "feed-gamma",
        publishedAt: "2026-03-14T03:20:00Z"
      }
    ],
    "2026-03-14T03:30:00Z",
    { visibleFeedCount: 2 }
  );

  assert.deepEqual(summary, {
    sourceCount: 3,
    feedCount: 3,
    postureLabel: "3 sources across 3 feeds",
    timingLabel: "Latest source 5m before event",
    visibleFeedLabels: ["feed-alpha", "feed-beta"],
    remainingFeedCount: 1
  });
});

test("formatSourceRelativeTiming handles exact, later, and invalid timestamps", () => {
  assert.equal(
    formatSourceRelativeTiming("2026-03-14T03:30:00Z", "2026-03-14T03:30:00Z"),
    "at event time"
  );
  assert.equal(
    formatSourceRelativeTiming("2026-03-14T05:30:00Z", "2026-03-14T03:30:00Z"),
    "2h after event"
  );
  assert.equal(formatSourceRelativeTiming("invalid", "2026-03-14T03:30:00Z"), null);
});
