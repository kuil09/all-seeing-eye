import test from "node:test";
import assert from "node:assert/strict";

import { deriveTimelineTags } from "./timeline-tags.mjs";

test("deriveTimelineTags keeps existing tags while normalizing duplicates", () => {
  assert.deepEqual(
    deriveTimelineTags({
      existingTags: [" Logistics ", "inspection", "inspection", "logistics"]
    }),
    ["logistics", "inspection"]
  );
});

test("deriveTimelineTags adds feed categories and mapped event-type tags", () => {
  assert.deepEqual(
    deriveTimelineTags({
      feedCategories: ["infrastructure", "weather", "Infrastructure"],
      eventType: "service_outage"
    }),
    ["infrastructure", "weather", "outage"]
  );
});

test("deriveTimelineTags falls back to a readable event-type phrase", () => {
  assert.deepEqual(
    deriveTimelineTags({
      feedCategories: ["security"],
      eventType: "credential_reset"
    }),
    ["security", "credential reset"]
  );
});
