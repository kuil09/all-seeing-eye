import test from "node:test";
import assert from "node:assert/strict";

import { buildQueueDistribution } from "./queue-distribution.mjs";

test("buildQueueDistribution counts status and confidence lanes and marks active filters", () => {
  const distribution = buildQueueDistribution(
    [
      { reviewStatus: "pending_review", confidence: { label: "high" } },
      { reviewStatus: "pending_review", confidence: { label: "medium" } },
      { reviewStatus: "approved", confidence: { label: "medium" } },
      { reviewStatus: "edited", confidence: { label: "low" } },
      { reviewStatus: "rejected", confidence: { label: "low" } }
    ],
    {
      reviewStatusFilter: "pending_review",
      confidenceFilter: "medium"
    }
  );

  assert.deepEqual(distribution, {
    totalCount: 5,
    statusOptions: [
      { value: "all", label: "All", count: 5, isActive: false },
      { value: "pending_review", label: "Pending", count: 2, isActive: true },
      { value: "approved", label: "Approved", count: 1, isActive: false },
      { value: "edited", label: "Edited", count: 1, isActive: false },
      { value: "rejected", label: "Rejected", count: 1, isActive: false }
    ],
    confidenceOptions: [
      { value: "all", label: "All", count: 5, isActive: false },
      { value: "high", label: "High", count: 1, isActive: false },
      { value: "medium", label: "Medium", count: 2, isActive: true },
      { value: "low", label: "Low", count: 2, isActive: false }
    ]
  });
});

test("buildQueueDistribution leaves unknown values out of named lanes while preserving the total", () => {
  const distribution = buildQueueDistribution([
    { reviewStatus: "pending_review", confidence: { label: "high" } },
    { reviewStatus: "deferred", confidence: { label: "unknown" } },
    { reviewStatus: "approved", confidence: null }
  ]);

  assert.deepEqual(
    distribution.statusOptions.map(({ value, count }) => [value, count]),
    [
      ["all", 3],
      ["pending_review", 1],
      ["approved", 1],
      ["edited", 0],
      ["rejected", 0]
    ]
  );

  assert.deepEqual(
    distribution.confidenceOptions.map(({ value, count }) => [value, count]),
    [
      ["all", 3],
      ["high", 1],
      ["medium", 0],
      ["low", 0]
    ]
  );
});
