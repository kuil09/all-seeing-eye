import test from "node:test";
import assert from "node:assert/strict";

import { buildAttentionLanes, resolveAttentionLane } from "./attention-lanes.mjs";
import { DRAFT_FILTER_SAVED } from "./view-state.mjs";

test("buildAttentionLanes counts saved drafts and pending-confidence presets", () => {
  const attentionLanes = buildAttentionLanes(
    [
      { eventId: "evt-1", reviewStatus: "pending_review", confidence: { label: "high" } },
      { eventId: "evt-2", reviewStatus: "pending_review", confidence: { label: "medium" } },
      { eventId: "evt-3", reviewStatus: "pending_review", confidence: { label: "low" } },
      { eventId: "evt-4", reviewStatus: "approved", confidence: { label: "high" } }
    ],
    {
      "evt-2": "Check the grid handoff.",
      "evt-4": "Already cleared."
    },
    {
      detailsByEventId: {
        "evt-1": { reviewActions: [] },
        "evt-2": { reviewActions: [{ action: "edit" }] },
        "evt-3": { reviewActions: [] },
        "evt-4": { reviewActions: [{ action: "approve" }] }
      },
      reviewStatusFilter: "all",
      confidenceFilter: "all",
      draftFilter: DRAFT_FILTER_SAVED,
      historyFilter: "all"
    }
  );

  assert.deepEqual(attentionLanes, [
    {
      id: "saved_drafts",
      label: "Saved drafts",
      count: 2,
      reviewStatusFilter: "all",
      confidenceFilter: "all",
      draftFilter: "saved",
      historyFilter: "all",
      isActive: true
    },
    {
      id: "pending_revisits",
      label: "Pending revisits",
      count: 1,
      reviewStatusFilter: "pending_review",
      confidenceFilter: "all",
      draftFilter: "all",
      historyFilter: "reviewed",
      isActive: false
    },
    {
      id: "reviewed_before",
      label: "Reviewed before",
      count: 2,
      reviewStatusFilter: "all",
      confidenceFilter: "all",
      draftFilter: "all",
      historyFilter: "reviewed",
      isActive: false
    },
    {
      id: "pending_high",
      label: "Pending + high",
      count: 1,
      reviewStatusFilter: "pending_review",
      confidenceFilter: "high",
      draftFilter: "all",
      historyFilter: "all",
      isActive: false
    },
    {
      id: "pending_medium",
      label: "Pending + medium",
      count: 1,
      reviewStatusFilter: "pending_review",
      confidenceFilter: "medium",
      draftFilter: "all",
      historyFilter: "all",
      isActive: false
    },
    {
      id: "pending_low",
      label: "Pending + low",
      count: 1,
      reviewStatusFilter: "pending_review",
      confidenceFilter: "low",
      draftFilter: "all",
      historyFilter: "all",
      isActive: false
    }
  ]);
});

test("resolveAttentionLane returns the configured preset for click handlers", () => {
  const preset = resolveAttentionLane("pending_medium");

  assert.equal(preset?.id, "pending_medium");
  assert.equal(preset?.label, "Pending + medium");
  assert.equal(preset?.reviewStatusFilter, "pending_review");
  assert.equal(preset?.confidenceFilter, "medium");
  assert.equal(preset?.draftFilter, "all");
  assert.equal(preset?.historyFilter, "all");
  assert.equal(typeof preset?.matches, "function");

  assert.equal(resolveAttentionLane("missing"), null);
});
