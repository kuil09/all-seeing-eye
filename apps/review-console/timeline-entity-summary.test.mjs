import assert from "node:assert/strict";
import test from "node:test";

import { buildTimelineEntitySummary } from "./timeline-entity-summary.mjs";

test("buildTimelineEntitySummary returns null when no usable entities are available", () => {
  assert.equal(buildTimelineEntitySummary([], { primaryLocation: "Harbor North cargo terminal" }), null);
  assert.equal(buildTimelineEntitySummary(undefined, {}), null);
});

test("buildTimelineEntitySummary omits the primary location and formats role labels", () => {
  const summary = buildTimelineEntitySummary(
    [
      {
        canonicalName: "Harbor North cargo terminal",
        role: "location"
      },
      {
        canonicalName: "Harbor North Port Authority",
        role: "operator"
      },
      {
        canonicalName: "Coastal Shipping Association",
        role: "observer"
      }
    ],
    {
      primaryLocation: "Harbor North cargo terminal"
    }
  );

  assert.deepEqual(summary, {
    visibleParticipants: [
      "Operator: Harbor North Port Authority",
      "Observer: Coastal Shipping Association"
    ],
    remainingCount: 0
  });
});

test("buildTimelineEntitySummary falls back to canonical names for generic roles and reports overflow", () => {
  const summary = buildTimelineEntitySummary(
    [
      {
        canonicalName: "East Grid substation 7",
        role: "location"
      },
      {
        canonicalName: "East Grid",
        role: "operator"
      },
      {
        canonicalName: "District resilience cell",
        role: "related"
      },
      {
        canonicalName: "Regional weather desk",
        role: "supporting_observer"
      }
    ],
    {
      primaryLocation: "East Grid substation 7",
      visibleCount: 2
    }
  );

  assert.deepEqual(summary, {
    visibleParticipants: ["Operator: East Grid", "District resilience cell"],
    remainingCount: 1
  });
});

test("buildTimelineEntitySummary deduplicates repeated participants and falls back to ids", () => {
  const summary = buildTimelineEntitySummary(
    [
      {
        canonicalName: "Regional weather desk",
        role: "observer"
      },
      {
        canonicalName: "Regional weather desk",
        role: "observer"
      },
      {
        id: "ent_grid_watch",
        role: "supporting_observer"
      }
    ],
    {
      primaryLocation: ""
    }
  );

  assert.deepEqual(summary, {
    visibleParticipants: [
      "Observer: Regional weather desk",
      "Supporting observer: ent_grid_watch"
    ],
    remainingCount: 0
  });
});
