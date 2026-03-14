import { buildReviewHistorySummary } from "./review-history-summary.mjs";
import { buildSourceProvenanceSummary } from "./source-provenance-summary.mjs";

const EMPTY_REVIEW_NOTE_LABEL = "No notes recorded.";

export function buildReviewNoteSuggestions(detail) {
  if (!detail?.event) {
    return [];
  }

  const suggestions = [];
  const confidenceSuggestion = buildConfidenceSuggestion(detail.event.confidence?.rationale);
  const sourceSuggestion = buildSourceSuggestion(detail.sources, detail.event.eventTime);
  const priorReviewSuggestion = buildPriorReviewSuggestion(detail.reviewActions);

  if (confidenceSuggestion) {
    suggestions.push({
      id: "confidence-rationale",
      label: "Use confidence rationale",
      note: confidenceSuggestion,
      tone: "neutral"
    });
  }

  if (sourceSuggestion) {
    suggestions.push({
      id: "source-posture",
      label: "Use source posture",
      note: sourceSuggestion,
      tone: "neutral"
    });
  }

  if (priorReviewSuggestion) {
    suggestions.push({
      id: "prior-review",
      label: "Reference prior review",
      note: priorReviewSuggestion,
      tone: "neutral"
    });
  }

  suggestions.push(
    {
      id: "edit-starter",
      label: "Start edit note",
      note: "Analyst edit required before approval because:",
      tone: "edit"
    },
    {
      id: "reject-starter",
      label: "Start reject note",
      note: "Rejecting pending stronger corroboration because:",
      tone: "reject"
    }
  );

  return suggestions;
}

export function applyReviewNoteSuggestion(currentNotes, suggestionNote) {
  const normalizedCurrentNotes = normalizeNote(currentNotes);
  const normalizedSuggestionNote = normalizeNote(suggestionNote);

  if (!normalizedSuggestionNote) {
    return normalizedCurrentNotes;
  }

  if (!normalizedCurrentNotes) {
    return normalizedSuggestionNote;
  }

  if (
    normalizeForComparison(normalizedCurrentNotes).includes(
      normalizeForComparison(normalizedSuggestionNote)
    )
  ) {
    return normalizedCurrentNotes;
  }

  return `${normalizedCurrentNotes}\n\n${normalizedSuggestionNote}`;
}

function buildConfidenceSuggestion(rationale) {
  const normalizedRationale = normalizeNote(rationale);
  if (!normalizedRationale) {
    return null;
  }

  return `Confidence rationale: ${normalizedRationale}`;
}

function buildSourceSuggestion(sources, eventTime) {
  const sourceSummary = buildSourceProvenanceSummary(sources, eventTime);
  if (!sourceSummary) {
    return null;
  }

  return `Source posture: ${sourceSummary.postureLabel}${
    sourceSummary.timingLabel ? `. ${sourceSummary.timingLabel}.` : "."
  }`;
}

function buildPriorReviewSuggestion(reviewActions) {
  const reviewHistorySummary = buildReviewHistorySummary(reviewActions);
  const notePreview = normalizeNote(reviewHistorySummary?.notePreview);

  if (!notePreview || notePreview === EMPTY_REVIEW_NOTE_LABEL) {
    return null;
  }

  return `Prior review note: ${notePreview}`;
}

function normalizeNote(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeForComparison(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
