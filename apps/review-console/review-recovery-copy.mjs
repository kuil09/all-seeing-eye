export const NOTE_RECOVERY_NONE = "none";
export const NOTE_RECOVERY_RESTORE = "restore_saved_note";
export const NOTE_RECOVERY_KEEP_CURRENT_DRAFT = "keep_current_draft";

export function resolveReviewRecoveryMode({
  storedNotePreview = "",
  currentDraftPreview = ""
} = {}) {
  if (normalizeLabel(currentDraftPreview)) {
    return NOTE_RECOVERY_KEEP_CURRENT_DRAFT;
  }

  if (normalizeLabel(storedNotePreview)) {
    return NOTE_RECOVERY_RESTORE;
  }

  return NOTE_RECOVERY_NONE;
}

export function buildReviewRecoveryPreviewCopy({
  recoveryMode = NOTE_RECOVERY_NONE,
  storedNotePreview = "",
  currentDraftPreview = ""
} = {}) {
  if (recoveryMode === NOTE_RECOVERY_RESTORE) {
    const preview = normalizeLabel(storedNotePreview);
    return preview ? `Restores note: ${preview}` : "";
  }

  if (recoveryMode === NOTE_RECOVERY_KEEP_CURRENT_DRAFT) {
    const preview = normalizeLabel(currentDraftPreview);
    return preview ? `Keeps current draft: ${preview}` : "";
  }

  return "";
}

export function buildReviewRecoveryActionCopy({
  queueContext = null,
  recoveryMode = NOTE_RECOVERY_NONE,
  nextPendingHeadline = "",
  sourceSwitchLabel = "",
  requiresQueueContextRestore = false
} = {}) {
  const normalizedSourceSwitchLabel = normalizeLabel(sourceSwitchLabel);
  if (normalizedSourceSwitchLabel) {
    return appendReviewRecoveryOutcome(
      `Switch to ${normalizedSourceSwitchLabel} and reopen this event in its saved queue slice.`,
      recoveryMode
    );
  }

  const queueContextRestoreCopy = Boolean(requiresQueueContextRestore);

  if (!queueContext) {
    if (queueContextRestoreCopy) {
      return appendReviewRecoveryOutcome(
        "Restore the saved queue slice and reopen this event.",
        recoveryMode
      );
    }

    if (recoveryMode === NOTE_RECOVERY_RESTORE) {
      return "Reopen this event and restore the last analyst note.";
    }

    if (recoveryMode === NOTE_RECOVERY_KEEP_CURRENT_DRAFT) {
      return "Reopen this event. Current draft stays attached.";
    }

    return "Reopen this event.";
  }

  if (queueContext.pendingPosition !== null) {
    if (queueContextRestoreCopy) {
      return appendReviewRecoveryOutcome(
        "Restore the saved queue slice and reopen this pending event.",
        recoveryMode
      );
    }

    if (recoveryMode === NOTE_RECOVERY_RESTORE) {
      return "Reopen this pending event and restore the last analyst note.";
    }

    if (recoveryMode === NOTE_RECOVERY_KEEP_CURRENT_DRAFT) {
      return "Reopen this pending event. Current draft stays attached.";
    }

    return "Reopen this pending event.";
  }

  if (queueContext.pendingCount === 0) {
    return appendReviewRecoveryOutcome(
      queueContextRestoreCopy
        ? "Restore the saved queue slice and reopen this reviewed event after the queue cleared."
        : "Reopen this reviewed event after the queue cleared.",
      recoveryMode
    );
  }

  if (normalizeLabel(nextPendingHeadline)) {
    return appendReviewRecoveryOutcome(
      `${
        queueContextRestoreCopy
          ? "Restore the saved queue slice and reopen this reviewed event for context."
          : "Reopen this reviewed event for context."
      } Next pending: ${normalizeLabel(nextPendingHeadline)}.`,
      recoveryMode
    );
  }

  return appendReviewRecoveryOutcome(
    queueContextRestoreCopy
      ? "Restore the saved queue slice and reopen this reviewed event for context."
      : "Reopen this reviewed event for context.",
    recoveryMode
  );
}

export function buildReviewRecoveryButtonLabel({
  queueContext = null,
  recoveryMode = NOTE_RECOVERY_NONE,
  sourceSwitchLabel = "",
  requiresQueueContextRestore = false
} = {}) {
  const normalizedSourceSwitchLabel = normalizeLabel(sourceSwitchLabel);
  if (normalizedSourceSwitchLabel) {
    if (recoveryMode === NOTE_RECOVERY_RESTORE) {
      return `Switch to ${normalizedSourceSwitchLabel}, reopen, and restore note`;
    }

    if (recoveryMode === NOTE_RECOVERY_KEEP_CURRENT_DRAFT) {
      return `Switch to ${normalizedSourceSwitchLabel}, reopen, and keep current draft`;
    }

    return `Switch to ${normalizedSourceSwitchLabel} and reopen`;
  }

  if (requiresQueueContextRestore) {
    if (recoveryMode === NOTE_RECOVERY_RESTORE) {
      return "Restore queue slice, reopen, and restore note";
    }

    if (recoveryMode === NOTE_RECOVERY_KEEP_CURRENT_DRAFT) {
      return "Restore queue slice, reopen, and keep current draft";
    }

    return "Restore queue slice and reopen";
  }

  if (!queueContext) {
    return appendReviewRecoveryButtonOutcome("Reopen event", recoveryMode);
  }

  if (queueContext.pendingPosition !== null) {
    return appendReviewRecoveryButtonOutcome("Reopen pending event", recoveryMode);
  }

  if (queueContext.pendingCount === 0) {
    return appendReviewRecoveryButtonOutcome("Reopen reviewed event", recoveryMode);
  }

  return appendReviewRecoveryButtonOutcome(
    "Reopen reviewed event for context",
    recoveryMode
  );
}

function appendReviewRecoveryOutcome(baseCopy, recoveryMode) {
  if (recoveryMode === NOTE_RECOVERY_RESTORE) {
    return `${baseCopy} Restore the last analyst note.`;
  }

  if (recoveryMode === NOTE_RECOVERY_KEEP_CURRENT_DRAFT) {
    return `${baseCopy} Current draft stays attached.`;
  }

  return baseCopy;
}

function appendReviewRecoveryButtonOutcome(baseLabel, recoveryMode) {
  if (recoveryMode === NOTE_RECOVERY_RESTORE) {
    return `${baseLabel} and restore note`;
  }

  if (recoveryMode === NOTE_RECOVERY_KEEP_CURRENT_DRAFT) {
    return `${baseLabel} and keep current draft`;
  }

  return baseLabel;
}

function normalizeLabel(value) {
  return typeof value === "string" ? value.trim() : "";
}
