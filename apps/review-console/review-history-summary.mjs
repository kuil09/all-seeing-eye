const MAX_NOTE_PREVIEW_LENGTH = 96;

export function buildReviewHistorySummary(reviewActions) {
  const latestReviewAction = reviewActions?.[0];
  if (!latestReviewAction) {
    return null;
  }

  return {
    actionCount: reviewActions.length,
    actionLabel: String(latestReviewAction.action ?? "").replaceAll("_", " "),
    actorLabel:
      latestReviewAction.actorName?.trim() ||
      latestReviewAction.actorType?.trim() ||
      "Unknown reviewer",
    createdAt: latestReviewAction.createdAt,
    notePreview: formatNotePreview(latestReviewAction.notes)
  };
}

export function formatReviewActionCount(actionCount) {
  return `${actionCount} review action${actionCount === 1 ? "" : "s"}`;
}

function formatNotePreview(notes) {
  const normalizedNotes = String(notes ?? "").trim();
  if (!normalizedNotes) {
    return "No notes recorded.";
  }

  if (normalizedNotes.length <= MAX_NOTE_PREVIEW_LENGTH) {
    return normalizedNotes;
  }

  return `${normalizedNotes.slice(0, MAX_NOTE_PREVIEW_LENGTH - 3).trimEnd()}...`;
}
