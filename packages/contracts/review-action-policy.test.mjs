import test from "node:test";
import assert from "node:assert/strict";

import {
  getReviewActionValidationError,
  sanitizeReviewNotes
} from "./review-action-policy.mjs";

test("approve allows empty review notes", () => {
  assert.equal(getReviewActionValidationError("approve", "   "), null);
});

test("edit requires analyst notes", () => {
  assert.equal(
    getReviewActionValidationError("edit", "  "),
    "Analyst notes are required when marking an event as edited."
  );
});

test("reject requires analyst notes", () => {
  assert.equal(
    getReviewActionValidationError("reject", ""),
    "Analyst notes are required when marking an event as rejected."
  );
});

test("sanitizeReviewNotes trims whitespace and preserves content", () => {
  assert.equal(sanitizeReviewNotes("  Needs source reconciliation.  "), "Needs source reconciliation.");
  assert.equal(sanitizeReviewNotes("\n\t "), null);
});
