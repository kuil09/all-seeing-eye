const CONTRACT_TO_STORAGE_REVIEW_STATUS = Object.freeze({
  pending_review: "pending",
  approved: "approved",
  edited: "needs_revision",
  rejected: "rejected"
});

const STORAGE_TO_CONTRACT_REVIEW_STATUS = Object.freeze({
  pending: "pending_review",
  approved: "approved",
  needs_revision: "edited",
  rejected: "rejected"
});

const CONTRACT_TO_STORAGE_POLARITY = Object.freeze({
  asserted: "supports",
  disputed: "contradicts",
  uncertain: "uncertain"
});

const STORAGE_TO_CONTRACT_POLARITY = Object.freeze({
  supports: "asserted",
  contradicts: "disputed",
  uncertain: "uncertain"
});

const STORAGE_ENTITY_TYPES = new Set([
  "person",
  "organization",
  "place",
  "asset",
  "account",
  "other"
]);

const CONFIDENCE_SCORE_BY_LABEL = Object.freeze({
  low: 0.35,
  medium: 0.64,
  high: 0.86
});

export function mapContractReviewStatusToStorage(reviewStatus) {
  return CONTRACT_TO_STORAGE_REVIEW_STATUS[reviewStatus] ?? "pending";
}

export function mapStorageReviewStatusToContract(reviewStatus) {
  return STORAGE_TO_CONTRACT_REVIEW_STATUS[reviewStatus] ?? "pending_review";
}

export function mapContractPolarityToStorage(polarity) {
  return CONTRACT_TO_STORAGE_POLARITY[polarity] ?? "uncertain";
}

export function mapStoragePolarityToContract(polarity) {
  return STORAGE_TO_CONTRACT_POLARITY[polarity] ?? "uncertain";
}

export function mapFixtureEntityTypeToStorage(entityType) {
  if (entityType === "facility") {
    return "place";
  }

  if (STORAGE_ENTITY_TYPES.has(entityType)) {
    return entityType;
  }

  return "other";
}

export function scoreFromConfidenceLabel(label) {
  return CONFIDENCE_SCORE_BY_LABEL[label] ?? CONFIDENCE_SCORE_BY_LABEL.medium;
}

export function deriveConfidenceLabel(score) {
  if (score >= 0.8) {
    return "high";
  }

  if (score >= 0.55) {
    return "medium";
  }

  return "low";
}
