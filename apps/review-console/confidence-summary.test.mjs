import assert from "node:assert/strict";
import test from "node:test";

import { buildConfidenceSummary } from "./confidence-summary.mjs";

test("buildConfidenceSummary returns null when confidence is missing", () => {
  assert.equal(buildConfidenceSummary(null, []), null);
});

test("buildConfidenceSummary summarizes claim posture and keeps short rationales intact", () => {
  const summary = buildConfidenceSummary(
    {
      label: "high",
      score: 0.88,
      rationale: "Two independent curated sources report matching inspection activity and delay symptoms."
    },
    [
      { polarity: "asserted" },
      { polarity: "asserted" },
      { polarity: "uncertain" }
    ]
  );

  assert.deepEqual(summary, {
    claimSignals: ["2 asserted claims", "1 uncertain claim"],
    rationalePreview:
      "Two independent curated sources report matching inspection activity and delay symptoms."
  });
});

test("buildConfidenceSummary falls back cleanly when claims or rationale are missing", () => {
  const summary = buildConfidenceSummary(
    {
      label: "medium",
      score: 0.51,
      rationale: ""
    },
    []
  );

  assert.deepEqual(summary, {
    claimSignals: ["No claim coverage yet"],
    rationalePreview: "Confidence rationale is not available yet."
  });
});

test("buildConfidenceSummary truncates long rationales and preserves unexpected polarities", () => {
  const summary = buildConfidenceSummary(
    {
      label: "medium",
      score: 0.73,
      rationale:
        "This confidence score remains provisional because the current source mix agrees on the outage but still leaves restoration timing and root-cause attribution unresolved for the analyst queue."
    },
    [{ polarity: "asserted" }, { polarity: "needs_follow_up" }]
  );

  assert.deepEqual(summary.claimSignals, [
    "1 asserted claim",
    "1 needs follow up claim"
  ]);
  assert.match(summary.rationalePreview, /\.\.\.$/);
  assert.ok(summary.rationalePreview.length <= 132);
});
