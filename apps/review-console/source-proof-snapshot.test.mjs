import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSourceProofSnapshotBundle,
  buildSourceProofSnapshots
} from "./source-proof-snapshot.mjs";

test("buildSourceProofSnapshots formats source titles, timing, and excerpt previews", () => {
  const snapshots = buildSourceProofSnapshots(
    [
      {
        title: "Harbor North security review extends outbound inspections",
        feedKey: "regional-port-bulletin",
        publishedAt: "2026-03-14T02:55:00Z",
        excerpt:
          "Outbound containers are subject to enhanced screening through the morning shift."
      },
      {
        title: "Members report cargo delays at Harbor North terminal",
        feedKey: "coastal-shipping-association",
        publishedAt: "2026-03-14T03:40:00Z",
        excerpt:
          "Shippers reported three to five hour processing delays tied to elevated inspection activity."
      }
    ],
    "2026-03-14T03:30:00Z"
  );

  assert.deepEqual(snapshots, [
    "Harbor North security review extends outbound inspections (regional-port-bulletin, 35m before event): Outbound containers are subject to enhanced screening through the morning shift.",
    "Members report cargo delays at Harbor North terminal (coastal-shipping-association, 10m after event): Shippers reported three to five hour processing delays tied to elevated inspection activity."
  ]);
});

test("buildSourceProofSnapshots limits the visible sources and truncates long excerpts", () => {
  const snapshots = buildSourceProofSnapshots(
    [
      {
        title: "First source",
        feedKey: "feed-one",
        publishedAt: "2026-03-14T03:20:00Z",
        excerpt:
          "This excerpt is deliberately long so the source proof snapshot has to trim the copy before it is shared into a handoff note for async review."
      },
      {
        title: "Second source",
        feedKey: "feed-two",
        publishedAt: "2026-03-14T03:25:00Z",
        excerpt: "Another supporting record."
      },
      {
        title: "Third source",
        feedKey: "feed-three",
        publishedAt: "2026-03-14T03:27:00Z",
        excerpt: "This record should not appear."
      }
    ],
    "2026-03-14T03:30:00Z",
    { excerptMaxLength: 72 }
  );

  assert.deepEqual(snapshots, [
    "First source (feed-one, 10m before event): This excerpt is deliberately long so the source proof snapshot has to...",
    "Second source (feed-two, 5m before event): Another supporting record."
  ]);
});

test("buildSourceProofSnapshotBundle prioritizes provenance-search matches and compresses overflow", () => {
  const selection = buildSourceProofSnapshotBundle(
    [
      {
        title: "Harbor North security review extends outbound inspections",
        feedKey: "regional-port-bulletin",
        publishedAt: "2026-03-14T02:55:00Z",
        excerpt:
          "Outbound containers are subject to enhanced screening through the morning shift."
      },
      {
        title: "Members report cargo delays at Harbor North terminal",
        feedKey: "coastal-shipping-association",
        publishedAt: "2026-03-14T03:40:00Z",
        excerpt:
          "Shippers reported three to five hour processing delays tied to elevated inspection activity."
      }
    ],
    "2026-03-14T03:30:00Z",
    {
      searchQuery: "coastal-shipping-association",
      activeSearchFocusTarget: "detail-provenance"
    }
  );

  assert.deepEqual(selection.items, [
    "Members report cargo delays at Harbor North terminal (coastal-shipping-association, 10m after event): Shippers reported three to five hour processing delays tied to elevated inspection activity."
  ]);
  assert.equal(selection.hiddenCount, 1);
  assert.equal(selection.hasQueryMatchPriority, true);
});
