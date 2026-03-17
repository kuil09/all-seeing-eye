import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReviewRecoveryActionCopy,
  buildReviewRecoveryButtonLabel,
  buildReviewRecoveryPreviewCopy,
  NOTE_RECOVERY_KEEP_CURRENT_DRAFT,
  NOTE_RECOVERY_NONE,
  NOTE_RECOVERY_RESTORE,
  resolveReviewRecoveryMode
} from "./review-recovery-copy.mjs";

test("resolveReviewRecoveryMode prefers the current draft when one exists", () => {
  const mode = resolveReviewRecoveryMode({
    storedNotePreview: "Recheck the source timing before handoff.",
    currentDraftPreview: "Working draft stays local."
  });

  assert.equal(mode, NOTE_RECOVERY_KEEP_CURRENT_DRAFT);
});

test("resolveReviewRecoveryMode falls back to restoring the stored note", () => {
  const mode = resolveReviewRecoveryMode({
    storedNotePreview: "Recheck the source timing before handoff."
  });

  assert.equal(mode, NOTE_RECOVERY_RESTORE);
});

test("resolveReviewRecoveryMode returns none when no note preview exists", () => {
  const mode = resolveReviewRecoveryMode();

  assert.equal(mode, NOTE_RECOVERY_NONE);
});

test("buildReviewRecoveryPreviewCopy labels restored notes and kept drafts", () => {
  assert.equal(
    buildReviewRecoveryPreviewCopy({
      recoveryMode: NOTE_RECOVERY_RESTORE,
      storedNotePreview: "Recheck the source timing before handoff."
    }),
    "Restores note: Recheck the source timing before handoff."
  );

  assert.equal(
    buildReviewRecoveryPreviewCopy({
      recoveryMode: NOTE_RECOVERY_KEEP_CURRENT_DRAFT,
      currentDraftPreview: "Working draft stays local."
    }),
    "Keeps current draft: Working draft stays local."
  );
});

test("buildReviewRecoveryActionCopy keeps pending and reviewed recovery wording accurate", () => {
  assert.equal(
    buildReviewRecoveryActionCopy({
      queueContext: {
        pendingPosition: 1,
        pendingCount: 2
      },
      recoveryMode: NOTE_RECOVERY_RESTORE
    }),
    "Reopen this pending event and restore the last analyst note."
  );

  assert.equal(
    buildReviewRecoveryActionCopy({
      queueContext: {
        pendingPosition: null,
        pendingCount: 1
      },
      recoveryMode: NOTE_RECOVERY_KEEP_CURRENT_DRAFT,
      nextPendingHeadline: "East grid outage enters overnight watch"
    }),
    "Reopen this reviewed event for context. Next pending: East grid outage enters overnight watch. Current draft stays attached."
  );

  assert.equal(
    buildReviewRecoveryActionCopy({
      recoveryMode: NOTE_RECOVERY_RESTORE,
      sourceSwitchLabel: "Contract fixtures"
    }),
    "Switch to Contract fixtures and reopen this event in its saved queue slice. Restore the last analyst note."
  );
});

test("buildReviewRecoveryActionCopy drops abstract fallback context wording when no queue snapshot exists", () => {
  assert.equal(
    buildReviewRecoveryActionCopy({
      recoveryMode: NOTE_RECOVERY_KEEP_CURRENT_DRAFT
    }),
    "Reopen this event. Current draft stays attached."
  );

  assert.equal(buildReviewRecoveryActionCopy(), "Reopen this event.");
});

test("buildReviewRecoveryActionCopy foregrounds saved queue-slice restores when filters diverge", () => {
  assert.equal(
    buildReviewRecoveryActionCopy({
      queueContext: {
        pendingPosition: null,
        pendingCount: 1
      },
      recoveryMode: NOTE_RECOVERY_KEEP_CURRENT_DRAFT,
      nextPendingHeadline: "East grid outage enters overnight watch",
      requiresQueueContextRestore: true
    }),
    "Restore the saved queue slice and reopen this reviewed event for context. Next pending: East grid outage enters overnight watch. Current draft stays attached."
  );
});

test("buildReviewRecoveryButtonLabel keeps flash-note actions concise and accurate", () => {
  assert.equal(
    buildReviewRecoveryButtonLabel({
      queueContext: {
        pendingPosition: null,
        pendingCount: 1
      },
      recoveryMode: NOTE_RECOVERY_RESTORE
    }),
    "Reopen reviewed event for context and restore note"
  );

  assert.equal(
    buildReviewRecoveryButtonLabel({
      queueContext: {
        pendingPosition: null,
        pendingCount: 0
      },
      recoveryMode: NOTE_RECOVERY_KEEP_CURRENT_DRAFT
    }),
    "Reopen reviewed event and keep current draft"
  );

  assert.equal(
    buildReviewRecoveryButtonLabel({
      recoveryMode: NOTE_RECOVERY_KEEP_CURRENT_DRAFT,
      sourceSwitchLabel: "Contract fixtures"
    }),
    "Switch to Contract fixtures, reopen, and keep current draft"
  );
});

test("buildReviewRecoveryButtonLabel foregrounds queue-slice restores when needed", () => {
  assert.equal(
    buildReviewRecoveryButtonLabel({
      queueContext: {
        pendingPosition: null,
        pendingCount: 1
      },
      requiresQueueContextRestore: true
    }),
    "Restore queue slice and reopen"
  );

  assert.equal(
    buildReviewRecoveryButtonLabel({
      queueContext: {
        pendingPosition: null,
        pendingCount: 1
      },
      recoveryMode: NOTE_RECOVERY_RESTORE,
      requiresQueueContextRestore: true
    }),
    "Restore queue slice, reopen, and restore note"
  );
});
